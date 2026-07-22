import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell, DisconnectBanner, RoomToast, GameCountdown } from './shared/ui';
import { SoundToggle } from './shared/ui/SoundToggle';
import { useGameSounds } from './shared/lib/useGameSounds';
import { HomePage } from './pages/Home/HomePage';
import { HostRoomPage } from './pages/HostRoom/HostRoomPage';
import { JoinRoomPage } from './pages/JoinRoom/JoinRoomPage';
import { GameRoomPage } from './pages/GameRoom/GameRoomPage';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';

/**
 * 라우터.
 *  /               홈 (방 만들기 / 코드 입력)
 *  /host/:roomId   호스트 방 (항목 입력 → QR 대기 → 게임 → 결과, status 분기)
 *  /r/:roomId      참가자 입장 (QR 링크가 여기로 · 닉네임)
 *  /game/:roomId   게임 진행·결과 (참가자 대기 → 관전 → 결과, status 분기)
 *  *               방 없음 / 만료 / 잘못된 주소
 *
 * 모든 페이지는 AppShell(모바일 프레임) 안에서 렌더되고,
 * DisconnectBanner가 소켓 끊김을 상단에 상시 알린다.
 */
function App() {
  // 게임 효과음 — store 변화를 관찰해 서버 이벤트 시점에 게임별 소리를 낸다(전역 1회 배선).
  useGameSounds();
  return (
    <BrowserRouter>
      <AppShell>
        <DisconnectBanner />
        <SoundToggle />
        <RoomToast />
        <GameCountdown />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/host/:roomId" element={<HostRoomPage />} />
          <Route path="/r/:roomId" element={<JoinRoomPage />} />
          <Route path="/game/:roomId" element={<GameRoomPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
