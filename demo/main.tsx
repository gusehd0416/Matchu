// 미리보기용: Next.js 없이 같은 게임 화면을 HTML 파일 하나로 묶는다.
import { createRoot } from 'react-dom/client';
import Game from '../components/Game';
import '../app/globals.css';

createRoot(document.getElementById('root')!).render(<Game />);
