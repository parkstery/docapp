# Vercel 배포 스크립트
Write-Host "=== Vercel 배포 시작 ===" -ForegroundColor Green

# 1. 빌드 확인
Write-Host "`n1. 빌드 확인 중..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "빌드 실패! 배포를 중단합니다." -ForegroundColor Red
    exit 1
}
Write-Host "빌드 성공!" -ForegroundColor Green

# 2. Vercel 로그인 확인
Write-Host "`n2. Vercel 로그인 확인 중..." -ForegroundColor Yellow
$loginCheck = vercel whoami 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Vercel 로그인이 필요합니다." -ForegroundColor Yellow
    Write-Host "브라우저에서 다음 URL로 이동하여 로그인하세요:" -ForegroundColor Cyan
    Write-Host "https://vercel.com/login" -ForegroundColor Cyan
    Write-Host "`n로그인 후 다음 명령어를 실행하세요:" -ForegroundColor Yellow
    Write-Host "vercel login" -ForegroundColor White
    Write-Host "`n또는 브라우저에서 직접 배포하세요:" -ForegroundColor Yellow
    Write-Host "https://vercel.com/new" -ForegroundColor Cyan
    exit 1
}
Write-Host "로그인 확인됨: $loginCheck" -ForegroundColor Green

# 3. 프로덕션 배포
Write-Host "`n3. 프로덕션 배포 시작..." -ForegroundColor Yellow
vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host "배포 실패!" -ForegroundColor Red
    exit 1
}

Write-Host "`n=== 배포 완료! ===" -ForegroundColor Green
Write-Host "배포된 URL을 확인하세요." -ForegroundColor Cyan
