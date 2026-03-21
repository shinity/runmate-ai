---
name: sync-branches
description: develop과 master 브랜치를 동기화합니다
argument-hint: to-master | to-develop
---

`$ARGUMENTS` 방향으로 브랜치를 동기화하세요.

## develop → master (릴리즈)

```bash
git checkout master
git merge develop
git push
git checkout develop
```

## master → develop (핫픽스 반영)

```bash
git checkout develop
git merge master
git push
git checkout develop
```

## 현재 상태 확인

```bash
git log --oneline --graph --all -10
```
