import { formatPace, formatDistance, formatDuration } from '../../lib/format'

describe('formatPace', () => {
  it('정상 페이스 포맷', () => {
    expect(formatPace(360)).toBe('6:00')
    expect(formatPace(330)).toBe('5:30')
    expect(formatPace(305)).toBe('5:05')
  })

  it('초가 두 자리로 패딩됨', () => {
    expect(formatPace(361)).toBe('6:01')
    expect(formatPace(600)).toBe('10:00')
  })
})

describe('formatDistance', () => {
  it('1km 미만은 m로 표시', () => {
    expect(formatDistance(500)).toBe('500m')
    expect(formatDistance(999)).toBe('999m')
  })

  it('1km 이상은 km로 표시 (소수점 1자리)', () => {
    expect(formatDistance(1000)).toBe('1.0km')
    expect(formatDistance(5500)).toBe('5.5km')
    expect(formatDistance(10000)).toBe('10.0km')
  })

  it('경계값: 정확히 1000m', () => {
    expect(formatDistance(1000)).toBe('1.0km')
  })
})

describe('formatDuration', () => {
  it('1시간 미만은 MM:SS', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(90)).toBe('1:30')
    expect(formatDuration(3599)).toBe('59:59')
  })

  it('1시간 이상은 H:MM:SS', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
    expect(formatDuration(3661)).toBe('1:01:01')
    expect(formatDuration(7322)).toBe('2:02:02')
  })

  it('분/초 두 자리 패딩', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3605)).toBe('1:00:05')
  })
})
