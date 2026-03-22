import io
import math
import base64
from typing import Optional

import numpy as np
import matplotlib
matplotlib.use('Agg')  # headless (no display)
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from mpl_toolkits.mplot3d.art3d import Line3DCollection


# ─── Helpers ───────────────────────────────────────────────────────────────

def pace_to_color_value(pace_sec: Optional[float]) -> float:
    """pace → 0.0(slow) ~ 1.0(fast) 정규화"""
    if pace_sec is None:
        return 0.5
    clamped = max(240, min(480, pace_sec))
    return 1.0 - (clamped - 240) / 240


def normalize_coords(datapoints: list[dict]) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """위경도 + 고도를 x, y, z, pace 배열로 변환"""
    lats = np.array([p.get('lat') or 0.0 for p in datapoints])
    lngs = np.array([p.get('lng') or 0.0 for p in datapoints])
    alts = np.array([p.get('altitude_m') or 0.0 for p in datapoints])
    paces = np.array([p.get('pace_sec_per_km') for p in datapoints], dtype=object)

    # 위경도 → 미터 단위 근사 변환
    lat_center = np.mean(lats)
    x = (lngs - np.mean(lngs)) * math.cos(math.radians(lat_center)) * 111320
    y = (lats - np.mean(lats)) * 111320
    z = alts - np.min(alts)  # 최저점 기준 상대 고도

    colors = np.array([pace_to_color_value(p) for p in paces])
    return x, y, z, colors


def has_gps(datapoints: list[dict]) -> bool:
    return any(p.get('lat') and p.get('lng') for p in datapoints)


def has_altitude(datapoints: list[dict]) -> bool:
    alts = [p.get('altitude_m') for p in datapoints if p.get('altitude_m') is not None]
    return len(alts) > 0 and (max(alts) - min(alts)) > 5


# ─── 3D 렌더링 ──────────────────────────────────────────────────────────────

def render_3d(x, y, z, colors) -> bytes:
    fig = plt.figure(figsize=(8, 8), facecolor='#0a0a0a')
    ax = fig.add_subplot(111, projection='3d', facecolor='#0a0a0a')

    points = np.array([x, y, z]).T.reshape(-1, 1, 3)
    segments = np.concatenate([points[:-1], points[1:]], axis=1)

    lc = Line3DCollection(segments, cmap='plasma', linewidth=2.5, alpha=0.9)
    lc.set_array(colors[:-1])
    ax.add_collection3d(lc)

    ax.scatter([x[0]], [y[0]], [z[0]], color='#00ff88', s=80, zorder=5)
    ax.scatter([x[-1]], [y[-1]], [z[-1]], color='#ff4455', s=80, zorder=5)

    z_floor = np.min(z) - (np.max(z) - np.min(z)) * 0.1
    ax.plot(x, y, z_floor, color='#ffffff', alpha=0.15, linewidth=1)

    ax.set_xlim(x.min(), x.max())
    ax.set_ylim(y.min(), y.max())
    ax.set_zlim(z_floor, z.max() * 1.1 + 1)

    for pane in [ax.xaxis.pane, ax.yaxis.pane, ax.zaxis.pane]:
        pane.fill = False
        pane.set_edgecolor('#333333')

    ax.tick_params(colors='#444444')
    ax.grid(True, color='#222222', linewidth=0.5)
    ax.view_init(elev=25, azim=-60)
    ax.set_xlabel('')
    ax.set_ylabel('')
    ax.set_zlabel('고도 (m)', color='#888888', fontsize=8)

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='#0a0a0a', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ─── 2D 폴백 (고도 데이터 없을 때) ───────────────────────────────────────────

def render_2d(x, y, colors) -> bytes:
    fig, ax = plt.subplots(figsize=(8, 8), facecolor='#0a0a0a')
    ax.set_facecolor('#0a0a0a')

    points = np.array([x, y]).T.reshape(-1, 1, 2)
    segments = np.concatenate([points[:-1], points[1:]], axis=1)

    lc = LineCollection(segments, cmap='plasma', linewidth=3, alpha=0.9)
    lc.set_array(colors[:-1])
    ax.add_collection(lc)

    ax.scatter(x[0], y[0], color='#00ff88', s=80, zorder=5)
    ax.scatter(x[-1], y[-1], color='#ff4455', s=80, zorder=5)

    margin_x = abs(x.max() - x.min()) * 0.1 or 1
    margin_y = abs(y.max() - y.min()) * 0.1 or 1
    ax.set_xlim(x.min() - margin_x, x.max() + margin_x)
    ax.set_ylim(y.min() - margin_y, y.max() + margin_y)
    ax.set_aspect('equal')
    ax.axis('off')

    plt.tight_layout()
    buf = io.BytesIO()
    plt.savefig(buf, format='png', dpi=150, bbox_inches='tight',
                facecolor='#0a0a0a', edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return buf.read()


# ─── 메인 ───────────────────────────────────────────────────────────────────

async def generate_route_art(
    run_id: str,
    datapoints: list[dict],
    city: Optional[str] = None,
    weather_condition: Optional[str] = None,
    avg_pace_sec_per_km: Optional[int] = None,
) -> dict:
    if not datapoints or not has_gps(datapoints):
        return {'status': 'skipped', 'reason': 'no_gps_data'}

    x, y, z, colors = normalize_coords(datapoints)

    if len(x) < 2:
        return {'status': 'skipped', 'reason': 'insufficient_datapoints'}

    use_3d = has_altitude(datapoints)
    image_bytes = render_3d(x, y, z, colors) if use_3d else render_2d(x, y, colors)

    return {
        'status': 'completed',
        'run_id': run_id,
        'render_mode': '3d' if use_3d else '2d',
        'image_b64': base64.b64encode(image_bytes).decode('utf-8'),
        'mime_type': 'image/png',
    }
