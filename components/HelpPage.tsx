import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, Mail } from 'lucide-react';
import { CONTACT_EMAIL } from '../constants/contact';

const HelpPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft size={20} /> 앱으로 돌아가기
        </Link>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <h1 className="flex items-center gap-2 text-lg sm:text-xl font-bold text-slate-900 mb-6">
            <BookOpen size={24} /> 도움말
          </h1>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">1. 기본 사용법</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm leading-6 break-words">
              <li><strong>로그인</strong>: Google 계정으로 로그인합니다.</li>
              <li><strong>앱 목록</strong>: 대시보드에서 관리 중인 앱 프로젝트를 보고, 추가·수정·삭제할 수 있습니다.</li>
              <li><strong>앱 선택</strong>: 카드를 클릭하면 해당 앱의 상세(참고, 보고서, 프롬프트, 메모, 트러블슈팅, 스크린샷)로 이동합니다.</li>
              <li><strong>각 탭</strong>: 참고(기획서), 보고서, 프롬프트 로그, 메모, 이슈, 스크린샷을 탭으로 구분해 관리합니다.</li>
              <li><strong>파일 첨부</strong>: 보고서·프롬프트·메모·이슈에서는 여러 개의 파일을 업로드할 수 있습니다.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">2. 오류 대응</h2>
            <ul className="list-disc list-inside space-y-2 text-slate-600 text-sm leading-6 break-words">
              <li><strong>화면이 안 뜰 때</strong>: 인터넷 연결을 확인한 뒤 새로고침해 보세요.</li>
              <li><strong>로그인이 안 될 때</strong>: 팝업 차단을 해제하고, Google 로그인 창이 열리는지 확인해 주세요.</li>
              <li><strong>파일 업로드 실패</strong>: 파일 크기(10MB 이하)와 형식을 확인해 주세요. 계속 실패하면 문의해 주세요.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-800 mb-3">3. 문의</h2>
            <p className="text-slate-600 text-sm mb-2 break-words">
              서비스 이용 중 불편 사항이나 제안이 있으시면 아래 이메일로 연락해 주세요.
            </p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800 font-medium break-all"
            >
              <Mail size={18} /> {CONTACT_EMAIL}
            </a>
          </section>
        </div>

        <div className="mt-6 text-center text-xs text-slate-400">
          <Link to="/privacy" className="underline hover:text-slate-600">개인정보처리방침</Link>
        </div>
      </div>
    </div>
  );
};

export default HelpPage;
