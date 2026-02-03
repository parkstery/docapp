import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Mail } from 'lucide-react';
import { CONTACT_EMAIL } from '../constants/contact';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft size={20} /> 앱으로 돌아가기
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900 mb-6">
            <Shield size={24} /> 개인정보처리방침
          </h1>
          <p className="text-slate-500 text-sm mb-6">최종 업데이트: {new Date().toLocaleDateString('ko-KR')}</p>

          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-2">1. 수집하는 정보</h2>
            <p className="text-slate-600 text-sm">
              본 앱은 서비스 제공을 위해 아래 정보를 수집·이용할 수 있습니다.
            </p>
            <ul className="list-disc list-inside mt-2 text-slate-600 text-sm space-y-1">
              <li><strong>로그인 정보</strong>: Google 로그인 시 이메일 주소, 표시 이름, 프로필 사진(선택).</li>
              <li><strong>서비스 이용 데이터</strong>: 앱 내에서 작성·업로드한 기획서, 보고서, 메모, 이슈, 첨부 파일 등. Firebase(Google) 서버에 저장됩니다.</li>
            </ul>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-2">2. 위치정보</h2>
            <p className="text-slate-600 text-sm">
              본 앱은 위치정보를 수집하거나 이용하지 않습니다.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-2">3. 쿠키 및 저장 기술</h2>
            <p className="text-slate-600 text-sm">
              로그인 유지 및 서비스 이용을 위해 브라우저 저장소(로컬 스토리지 등)와 Firebase 인증 세션을 사용합니다. 광고용 쿠키는 현재 사용하지 않습니다.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-2">4. 제3자 제공</h2>
            <p className="text-slate-600 text-sm">
              수집된 정보는 서비스 운영(인증, 데이터 저장)을 위해 Google Firebase에 전달·저장됩니다. Google의 개인정보 처리 방침이 적용됩니다.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-2">5. 보관 기간</h2>
            <p className="text-slate-600 text-sm">
              이용자가 삭제할 때까지 보관하며, 계정 삭제 요청 시 관련 데이터 삭제를 요청할 수 있습니다.
            </p>
          </section>

          <section className="mb-6">
            <h2 className="text-base font-semibold text-slate-800 mb-2">6. 문의</h2>
            <p className="text-slate-600 text-sm mb-2">
              개인정보 처리에 관한 문의·열람·정정·삭제 요청은 아래 이메일로 연락해 주세요.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium"
            >
              <Mail size={18} /> {CONTACT_EMAIL}
            </a>
          </section>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          <Link to="/help" className="underline hover:text-slate-600">도움말</Link>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
