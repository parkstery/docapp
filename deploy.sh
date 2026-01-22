#!/bin/bash

# Vercel 배포 스크립트
echo "=== Vercel 배포 시작 ==="

# 1. 빌드 확인
echo ""
echo "1. 빌드 확인 중..."
npm run build
if [ $? -ne 0 ]; then
    echo "빌드 실패! 배포를 중단합니다."
    exit 1
fi
echo "빌드 성공!"

# 2. Vercel 로그인 확인
echo ""
echo "2. Vercel 로그인 확인 중..."
if ! vercel whoami > /dev/null 2>&1; then
    echo "Vercel 로그인이 필요합니다."
    echo "브라우저에서 다음 URL로 이동하여 로그인하세요:"
    echo "https://vercel.com/login"
    echo ""
    echo "로그인 후 다음 명령어를 실행하세요:"
    echo "vercel login"
    echo ""
    echo "또는 브라우저에서 직접 배포하세요:"
    echo "https://vercel.com/new"
    exit 1
fi
echo "로그인 확인됨: $(vercel whoami)"

# 3. 프로덕션 배포
echo ""
echo "3. 프로덕션 배포 시작..."
vercel --prod --yes
if [ $? -ne 0 ]; then
    echo "배포 실패!"
    exit 1
fi

echo ""
echo "=== 배포 완료! ==="
echo "배포된 URL을 확인하세요."
