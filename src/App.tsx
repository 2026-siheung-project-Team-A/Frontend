import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from './pages/Home/HomePage';
import { HostRoomPage } from './pages/HostRoom/HostRoomPage';
import { JoinRoomPage } from './pages/JoinRoom/JoinRoomPage';
import { GameRoomPage } from './pages/GameRoom/GameRoomPage';

/**
 * 라우터.
 *  /               홈 (방 만들기)
 *  /host/:roomId   호스트 방
 *  /r/:roomId      참가자 입장 (QR 링크가 여기로)
 *  /game/:roomId   게임 진행·결과
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/host/:roomId" element={<HostRoomPage />} />
        <Route path="/r/:roomId" element={<JoinRoomPage />} />
        <Route path="/game/:roomId" element={<GameRoomPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
