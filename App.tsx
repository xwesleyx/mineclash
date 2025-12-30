
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Player, AIRoundData, GameConfig, PlayerEffect } from './types.ts';
import { generateAIRound } from './services/geminiService.ts';
import Heart from './components/Heart.tsx';

declare const Peer: any;

const MinecraftItemImage = ({ itemName, className }: { itemName: string, className?: string }) => {
  const formattedName = itemName.trim().replace(/ /g, '_');
  const imageUrl = `https://minecraft.wiki/w/Special:FilePath/${encodeURIComponent(formattedName)}.png`;
  
  return (
    <div className={`relative flex flex-col items-center justify-center gap-3 ${className}`}>
        <div className="w-24 h-24 bg-black/10 p-3 border-4 border-black/30 flex items-center justify-center shadow-inner">
            <img 
              src={imageUrl} 
              alt={itemName} 
              className="w-full h-full object-contain pixelated"
              style={{ imageRendering: 'pixelated' }}
              onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://minecraft.wiki/w/Special:FilePath/Barrier.png';
              }}
            />
        </div>
        <span className="text-xl font-black uppercase text-center bg-[#3e2723] text-[#fceb83] px-3 py-1 border-2 border-[#fceb83] shadow-lg max-w-[140px] truncate">{itemName}</span>
    </div>
  );
};

const GameLogo = () => (
    <div className="flex flex-col items-center mb-6 animate-float relative">
        <div className="flex items-center gap-6">
            <div className="w-16 h-16 -rotate-12 translate-y-6">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                    <path d="M14 2L22 10L20 12L18 10L10 18L8 16L16 8L14 6L14 2Z" fill="#9e9e9e" stroke="black" strokeWidth="2"/>
                    <path d="M4 20L6 22L12 16L10 14L4 20Z" fill="#795548" stroke="black" strokeWidth="2"/>
                </svg>
            </div>
            <div className="w-32 h-32 bg-[#3e2723] border-8 border-black relative overflow-hidden shadow-2xl">
                <div className="absolute inset-0 bg-green-600 top-0 h-1/3 border-b-4 border-green-800"></div>
                <div className="absolute inset-x-0 top-1/3 bottom-0 bg-[#795548]"></div>
            </div>
            <div className="w-16 h-16 rotate-12 translate-y-6">
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="drop-shadow-lg">
                    <path d="M18 2L22 6L10 18L6 14L18 2Z" fill="#e0e0e0" stroke="black" strokeWidth="2"/>
                    <path d="M4 18L6 20L8 18L6 16L4 18Z" fill="#795548" stroke="black" strokeWidth="2"/>
                </svg>
            </div>
        </div>
        <div className="bg-[#3e2723] px-10 py-3 mt-8 border-4 border-[#fceb83] shadow-2xl">
            <span className="text-[#fceb83] text-4xl font-black tracking-[0.2em] uppercase player-name-shadow">GOLD CLASH</span>
        </div>
    </div>
);

const MLGWaiting = () => (
    <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
        <div className="w-40 h-40 relative overflow-hidden minecraft-border bg-blue-400 p-4 flex items-center justify-center shadow-2xl scale-125">
            <div className="text-8xl">🪣</div>
        </div>
        <div className="text-center pt-8">
            <h3 className="text-4xl font-black uppercase text-[#3e2723] player-name-shadow">Aguardando MLG...</h3>
            <p className="text-xl font-bold opacity-60 uppercase tracking-widest">O Oráculo prepara o balde</p>
        </div>
    </div>
);

const LuckBlockIcon = ({ onClick, isBreaking }: { onClick?: () => void, isBreaking?: boolean }) => (
    <div 
        onClick={onClick}
        className={`w-64 h-64 bg-[#f2b134] border-[12px] border-[#3e2723] flex items-center justify-center text-9xl font-black cursor-pointer shadow-2xl relative ${isBreaking ? 'animate-jitter' : 'animate-gold hover:scale-105'}`}
        style={{ boxShadow: 'inset -16px -16px 0px #b08d0a, inset 16px 16px 0px #fceb83' }}
    >
        ?
    </div>
);

interface EffectTagProps {
    effect: PlayerEffect;
    onRemove?: () => void;
    isOracle: boolean;
}

const EffectTag: React.FC<EffectTagProps> = ({ effect, onRemove, isOracle }) => (
    <div className={`text-sm font-black uppercase px-4 py-2 border-4 border-black flex items-center gap-3 group relative shadow-lg cursor-help ${
        effect.type === 'Benefício' ? 'bg-green-600 text-white' : 
        effect.type === 'Maléfício' ? 'bg-red-600 text-white' : 'bg-purple-700 text-white'
    }`}>
        <span>{effect.name}</span>
        {isOracle && (
            <button onClick={(e) => { e.stopPropagation(); onRemove?.(); }} className="ml-1 bg-black/40 px-2 rounded border border-white/30 hover:bg-black/60">X</button>
        )}
        
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 hidden group-hover:block w-72 p-4 bg-[#3e2723] text-[#fceb83] border-4 border-[#fceb83] text-lg lowercase normal-case z-[100] shadow-2xl pointer-events-none text-center">
            <div className="font-black uppercase mb-2 border-b-2 border-[#fceb83]/30 text-xl">{effect.type}</div>
            {effect.description}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[12px] border-transparent border-t-[#3e2723]"></div>
        </div>
    </div>
);

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.ROLE_SELECT);
  const [config, setConfig] = useState<GameConfig>({ playerCount: 3, initialLives: 5, roomId: '', luckBlockAppeared: false });
  const [players, setPlayers] = useState<Player[]>([]);
  const [usedItems, setUsedItems] = useState<string[]>([]);
  const [aiData, setAiData] = useState<AIRoundData | null>(null);
  const [currentUser, setCurrentUser] = useState<{name: string, id: string, isHost: boolean} | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [customChoice, setCustomChoice] = useState('');
  const [isMining, setIsMining] = useState(false);
  const [isPeerReady, setIsPeerReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const peerRef = useRef<any>(null);
  const connsRef = useRef<any[]>([]);
  const hostConnRef = useRef<any>(null);

  const broadcastState = (overrides?: any) => {
    if (!currentUser?.isHost) return;
    const data = {
      type: 'SYNC',
      gameState: overrides?.gameState || gameState,
      players: overrides?.players || players,
      aiData: overrides?.aiData || aiData,
      config: overrides?.config || config,
      usedItems: overrides?.usedItems || usedItems,
    };
    connsRef.current.forEach(c => c.open && c.send(data));
  };

  const resetPeer = () => {
      if (peerRef.current) peerRef.current.destroy();
      peerRef.current = null;
      connsRef.current = [];
      hostConnRef.current = null;
      setIsPeerReady(false);
      setIsLoading(false);
      setPlayers([]);
      setCurrentUser(null);
  };

  const createRoom = () => {
    setIsLoading(true);
    const roomId = Math.random().toString(36).substring(2, 7).toUpperCase();
    try {
        const peer = new Peer(`MCCLASH-${roomId}`);
        peerRef.current = peer;

        peer.on('open', (id: string) => {
          const cleanId = id.replace('MCCLASH-', '');
          setConfig(prev => ({ ...prev, roomId: cleanId }));
          const hostUser = { name: "ORÁCULO", id: 'host', isHost: true };
          setCurrentUser(hostUser);
          setPlayers([{
              ...hostUser,
              lives: 100,
              effects: [],
              currentChoice: '',
              isRevealed: false,
              lostLifeThisRound: false,
              damageToTake: 0,
              isReady: true,
              isHost: true
          }]);
          setIsPeerReady(true);
          setIsLoading(false);
          setGameState(GameState.SETUP_ROOM);
        });

        peer.on('error', () => { 
            resetPeer(); 
            setGameState(GameState.ROLE_SELECT); 
            alert("Erro de conexão com o servidor PeerJS. Tente novamente.");
        });

        peer.on('connection', (conn: any) => {
          conn.on('open', () => { connsRef.current.push(conn); broadcastState(); });
          conn.on('data', (data: any) => {
            if (data.type === 'JOIN') {
              const p: Player = { ...data.player, lives: config.initialLives, effects: [], currentChoice: '', isRevealed: false, lostLifeThisRound: false, damageToTake: 1, isReady: true, isHost: false };
              setPlayers(prev => {
                  const newList = prev.some(pl => pl.id === p.id) ? prev : [...prev, p];
                  broadcastState({ players: newList });
                  return newList;
              });
            }
            if (data.type === 'CHOICE') {
              setPlayers(prev => {
                  const updated = prev.map(p => p.id === data.playerId ? { ...p, currentChoice: data.choice, isReady: true } : p);
                  broadcastState({ players: updated });
                  return updated;
              });
            }
            if (data.type === 'LUCK_BREAK') {
                setPlayers(prev => {
                    const updated = prev.map(p => p.id === data.playerId ? { ...p, isRevealed: true, effects: [...p.effects, data.effect], isReady: true } : p);
                    broadcastState({ players: updated });
                    return updated;
                });
            }
          });
        });
    } catch (e) {
        setIsLoading(false);
        setGameState(GameState.ROLE_SELECT);
    }
  };

  const joinRoom = () => {
    if (!playerName.trim() || !joinCode.trim()) return alert("Preencha o Nick e o Código!");
    setIsLoading(true);
    try {
        const peer = new Peer();
        peerRef.current = peer;
        const playerId = `p${Date.now()}`;

        peer.on('open', () => {
          const conn = peer.connect(`MCCLASH-${joinCode.toUpperCase()}`);
          hostConnRef.current = conn;
          setCurrentUser({ name: playerName, id: playerId, isHost: false });

          conn.on('open', () => {
            conn.send({ type: 'JOIN', player: { id: playerId, name: playerName } });
            setIsPeerReady(true);
            setIsLoading(false);
            setGameState(GameState.LOBBY);
          });

          conn.on('data', (data: any) => {
            if (data.type === 'SYNC') {
              setGameState(data.gameState);
              setPlayers(data.players);
              setAiData(data.aiData);
              setConfig(data.config);
              setUsedItems(data.usedItems || []);
            }
          });

          conn.on('error', () => { 
              resetPeer(); 
              setGameState(GameState.ROLE_SELECT); 
              alert("Sala não encontrada ou erro de rede.");
          });
        });
    } catch (e) {
        setIsLoading(false);
    }
  };

  const startNewRound = async () => {
    if (!currentUser?.isHost) return;
    setGameState(GameState.AI_THINKING);
    broadcastState({ gameState: GameState.AI_THINKING });
    
    try {
        const data = await generateAIRound(usedItems, config.luckBlockAppeared, players);
        setAiData(data);
        setGameState(GameState.PLAYERS_INPUT);
        setCustomChoice('');
        
        const updatedPlayers = players.map(p => ({ ...p, currentChoice: '', isRevealed: false, isReady: p.isHost }));
        setPlayers(updatedPlayers);
        broadcastState({ 
            gameState: GameState.PLAYERS_INPUT, 
            aiData: data, 
            players: updatedPlayers,
            config: { ...config, luckBlockAppeared: data.mode === 'Luck Block' || config.luckBlockAppeared } 
        });
    } catch (error) {
        console.error("AI Error:", error);
        setGameState(GameState.LOBBY);
        broadcastState({ gameState: GameState.LOBBY });
    }
  };

  const handlePlayerChoice = (choice: string) => {
    if (!currentUser || !choice.trim()) return;
    const updatedPlayers = players.map(p => p.id === currentUser.id ? { ...p, currentChoice: choice.trim().toUpperCase(), isReady: true } : p);
    setPlayers(updatedPlayers);
    if (!currentUser.isHost) hostConnRef.current?.send({ type: 'CHOICE', playerId: currentUser.id, choice: choice.trim().toUpperCase() });
    else broadcastState({ players: updatedPlayers });
  };

  const adjustLife = (playerId: string, delta: number) => {
    if (!currentUser?.isHost) return;
    const updatedPlayers = players.map(p => 
      p.id === playerId ? { ...p, lives: Math.max(0, p.lives + delta) } : p
    );
    setPlayers(updatedPlayers);
    broadcastState({ players: updatedPlayers });
  };

  const revealPlayer = (playerId: string) => {
    if (!currentUser?.isHost) return;
    const updatedPlayers = players.map(p => p.id === playerId ? { ...p, isRevealed: true } : p);
    setPlayers(updatedPlayers);
    broadcastState({ players: updatedPlayers });
  };

  const handleLuckBreak = () => {
      if (!aiData?.luckOutcomes || !currentUser) return;
      const effect = aiData.luckOutcomes[currentUser.id];
      if (!effect) return;
      setIsMining(true);
      setTimeout(() => {
          setIsMining(false);
          const newEffect = { ...effect, id: Math.random().toString(36).substr(2, 9) };
          const updatedPlayers = players.map(p => p.id === currentUser.id ? { ...p, isRevealed: true, effects: [...p.effects, newEffect], isReady: true } : p);
          setPlayers(updatedPlayers);
          if (currentUser.isHost) broadcastState({ players: updatedPlayers });
          else hostConnRef.current?.send({ type: 'LUCK_BREAK', playerId: currentUser.id, effect: newEffect });
      }, 1000);
  };

  const removeEffect = (playerId: string, effectId: string) => {
      if (!currentUser?.isHost) return;
      const updatedPlayers = players.map(p => p.id === playerId ? { ...p, effects: p.effects.filter(e => e.id !== effectId) } : p);
      setPlayers(updatedPlayers);
      broadcastState({ players: updatedPlayers });
  };

  const allPlayersReady = players.filter(p => !p.isHost).every(p => p.isReady);

  const shouldRenderImages = (mode: string) => {
    return [
      'Ferramenta Amaldiçoada', 'Mob Misterioso', 'Toque do Oráculo', 'Veio Amaldiçoado'
    ].includes(mode);
  };

  const isWritingMode = aiData?.mode === 'Tema da Sorte' || (aiData && aiData.items.length === 0);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col items-center justify-center p-4 relative bg-[#f2b134]">
      <div className="w-full max-w-5xl h-full max-h-[96vh] minecraft-border p-8 shadow-2xl text-[#3e2723] relative bg-[#fff9c4]/95 backdrop-blur-sm flex flex-col overflow-hidden">
        
        {/* Connection status indicator */}
        <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
           <div className={`w-4 h-4 rounded-full border-4 border-black ${isPeerReady ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
        </div>

        {/* Efeitos Ativos */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-40 max-w-[250px]">
            {players.filter(p => p.effects.length > 0 && !p.isHost).map(p => (
                <div key={p.id} className="bg-[#3e2723]/10 p-2 border-2 border-[#3e2723]/30 backdrop-blur-md">
                    <span className="text-xs font-black uppercase block mb-1">{p.name}</span>
                    <div className="flex flex-wrap gap-1">
                        {p.effects.map(e => (
                            <EffectTag key={e.id} effect={e} isOracle={currentUser?.isHost || false} onRemove={() => removeEffect(p.id, e.id)} />
                        ))}
                    </div>
                </div>
            ))}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center overflow-hidden">

        {isLoading && (
            <div className="text-center animate-pulse flex flex-col items-center gap-6">
                <div className="w-20 h-20 bg-[#3e2723] border-8 border-black animate-spin"></div>
                <p className="font-black uppercase text-3xl tracking-widest">Minerando Dados...</p>
            </div>
        )}

        {gameState === GameState.ROLE_SELECT && !isLoading && (
          <div className="text-center space-y-10 animate-in fade-in zoom-in duration-500 flex flex-col items-center w-full">
            <GameLogo />
            <h1 className="text-6xl md:text-8xl font-black uppercase text-[#3e2723] tracking-tighter leading-none player-name-shadow">MINECRAFT<br/>CLASH</h1>
            <div className="w-full max-w-sm space-y-6 pt-4">
              <button onClick={createRoom} className="minecraft-button w-full py-6 text-3xl shadow-2xl transform hover:-rotate-1">Criar Mundo</button>
              <button onClick={() => setGameState(GameState.JOIN_ROOM)} className="minecraft-button w-full py-6 text-3xl shadow-2xl transform hover:rotate-1">Entrar no Mundo</button>
            </div>
          </div>
        )}

        {gameState === GameState.JOIN_ROOM && !isLoading && (
          <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom flex flex-col items-center">
            <h2 className="text-5xl font-black uppercase border-b-6 border-[#3e2723] pb-2">Conectar</h2>
            <div className="w-full space-y-4">
                <input value={playerName} onChange={e => setPlayerName(e.target.value)} className="minecraft-input w-full text-2xl uppercase text-center" placeholder="SEU NICK" maxLength={12} />
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} className="minecraft-input w-full text-2xl uppercase font-black tracking-widest text-center" placeholder="CÓDIGO" maxLength={5} />
                <button onClick={joinRoom} className="minecraft-button w-full py-5 text-3xl mt-4">Conectar</button>
                <button onClick={() => setGameState(GameState.ROLE_SELECT)} className="w-full text-lg font-black uppercase opacity-50 py-2 hover:opacity-100">Voltar</button>
            </div>
          </div>
        )}

        {gameState === GameState.SETUP_ROOM && (
           <div className="w-full max-w-sm space-y-8 animate-in slide-in-from-bottom flex flex-col items-center">
             <h2 className="text-5xl font-black uppercase border-b-6 border-[#3e2723] pb-2 text-center w-full">Ajustes</h2>
             <div className="w-full space-y-8">
                <div className="bg-[#3e2723] text-[#fceb83] p-6 border-4 border-[#b08d0a] text-center shadow-2xl">
                    <p className="text-sm font-black uppercase opacity-70 mb-1 tracking-widest">Código da Sala:</p>
                    <p className="text-6xl font-black tracking-widest player-name-shadow">{config.roomId}</p>
                </div>
                <div className="space-y-4">
                    <label className="text-lg font-black uppercase opacity-70 block text-center tracking-widest">Vidas Iniciais:</label>
                    <div className="flex items-center justify-center gap-6">
                        <button onClick={() => setConfig(prev => ({...prev, initialLives: Math.max(1, prev.initialLives - 1)}))} className="minecraft-button w-14 h-14 text-4xl">-</button>
                        <span className="text-6xl font-black">{config.initialLives}</span>
                        <button onClick={() => setConfig(prev => ({...prev, initialLives: prev.initialLives + 1}))} className="minecraft-button w-14 h-14 text-4xl">+</button>
                    </div>
                </div>
                <button onClick={() => { setGameState(GameState.LOBBY); broadcastState({ gameState: GameState.LOBBY }); }} className="minecraft-button w-full py-6 text-4xl animate-gold mt-4">Abrir Mundo</button>
             </div>
           </div>
        )}

        {gameState === GameState.LOBBY && (
            <div className="w-full h-full flex flex-col items-center py-4 space-y-8 animate-in fade-in overflow-hidden">
                <div className="text-center w-full">
                    <h2 className="text-4xl font-black uppercase tracking-tight opacity-70">SALA DE ESPERA</h2>
                    <div className="mt-4 bg-[#3e2723] border-4 border-[#b08d0a] px-8 py-3 shadow-2xl animate-gold inline-block">
                        <p className="text-[#fceb83] text-sm font-black uppercase tracking-widest">CÓDIGO:</p>
                        <p className="text-[#fceb83] text-6xl font-black tracking-widest player-name-shadow">{config.roomId}</p>
                    </div>
                </div>

                <div className="flex-1 w-full max-w-md bg-black/5 border-4 border-dashed border-[#3e2723]/20 p-6 overflow-y-auto space-y-3 shadow-inner">
                    <h4 className="text-xl font-black uppercase opacity-50 tracking-widest mb-2">JOGADORES NA SALA:</h4>
                    {players.map(p => (
                        <div key={p.id} className="bg-white p-4 border-4 border-[#3e2723] flex justify-between items-center shadow-xl animate-pop">
                            <span className="font-black text-2xl uppercase tracking-tighter">{p.isHost ? '👑' : '⛏️'} {p.name}</span>
                            {p.id === currentUser?.id && <span className="text-xs font-black uppercase bg-[#3e2723] text-white px-3 py-1 border-2 border-[#fceb83]">VOCÊ</span>}
                        </div>
                    ))}
                </div>

                <div className="w-full max-w-sm">
                    {currentUser?.isHost ? (
                        <button onClick={startNewRound} disabled={players.length <= 1} className="minecraft-button w-full py-6 text-4xl animate-gold disabled:opacity-50">
                            INICIAR PARTIDA
                        </button>
                    ) : (
                        <div className="bg-[#3e2723] text-[#fceb83] py-5 px-8 border-4 border-[#fceb83] text-center shadow-2xl">
                            <span className="text-2xl font-black uppercase animate-pulse">Aguardando o Oráculo...</span>
                        </div>
                    )}
                </div>
            </div>
        )}

        {gameState === GameState.AI_THINKING && (
          <div className="text-center space-y-6 animate-pulse flex flex-col items-center justify-center flex-1">
             <div className="w-24 h-24 bg-[#3e2723] border-8 border-black animate-spin mb-4"></div>
             <h2 className="text-5xl font-black uppercase tracking-tighter text-[#b08d0a] player-name-shadow">O Oráculo está forjando...</h2>
          </div>
        )}

        {gameState === GameState.PLAYERS_INPUT && aiData && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500 flex flex-col h-full w-full overflow-hidden">
            <div className="flex flex-col items-center pt-2">
              <div className="bg-[#f2b134] w-full max-w-2xl p-6 border-6 border-[#3e2723] shadow-2xl flex flex-col items-center relative transform hover:-rotate-1 transition-transform">
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#3e2723] text-[#fceb83] px-6 py-2 text-xl font-black uppercase border-4 border-[#fceb83] tracking-[0.2em]">{aiData.mode}</div>
                 <h3 className="text-4xl font-black uppercase text-[#3e2723] text-center mt-4 player-name-shadow">{aiData.theme}</h3>
                 <div className="bg-[#3e2723] text-white px-4 py-2 mt-4 text-xl font-bold uppercase italic tracking-wider">
                    {aiData.description}
                 </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center items-center w-full overflow-hidden px-4">
                {currentUser?.isHost ? (
                    <div className="w-full max-w-xl space-y-4 flex flex-col items-center">
                        <h4 className="text-3xl font-black uppercase border-b-4 border-[#3e2723] pb-2 px-8">Mineradores Prontos</h4>
                        <div className="grid grid-cols-1 gap-2 w-full">
                            {players.filter(p => !p.isHost).map(p => (
                                <div key={p.id} className="bg-white/70 p-4 border-4 border-[#3e2723] flex justify-between items-center shadow-xl">
                                    <span className="font-black text-3xl uppercase tracking-tighter">{p.name}</span>
                                    <span className={`px-4 py-2 text-sm font-black uppercase border-4 border-black ${p.isReady ? 'bg-green-600 text-white shadow-[4px_4px_0px_rgba(0,0,0,0.3)]' : 'bg-red-600 text-white animate-pulse shadow-[4px_4px_0px_rgba(0,0,0,0.3)]'}`}>
                                        {p.isReady ? 'PRONTO' : 'PENDENTE'}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <button onClick={() => { setGameState(GameState.REVEAL_SEQUENCE); broadcastState({ gameState: GameState.REVEAL_SEQUENCE }); }} disabled={!allPlayersReady} className="minecraft-button w-full py-6 text-4xl mt-6 disabled:opacity-50 animate-gold">
                            REVELAR DESTINO
                        </button>
                    </div>
                ) : (
                    <div className="w-full max-w-4xl flex flex-col items-center gap-8">
                         {aiData.mode === 'Luck Block' ? (
                             <div className="flex flex-col items-center gap-6">
                                {players.find(p => p.id === currentUser?.id)?.isReady ? (
                                    <div className="text-center animate-pop">
                                        <h4 className="text-6xl font-black uppercase text-green-700 player-name-shadow mb-6">SORTE LANÇADA!</h4>
                                        <div className="w-32 h-32 bg-green-100 border-8 border-green-700 mx-auto flex items-center justify-center text-7xl shadow-2xl">✅</div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-6">
                                        <h4 className="text-4xl font-black uppercase animate-pulse player-name-shadow">QUEBRE O BLOCO!</h4>
                                        <LuckBlockIcon onClick={handleLuckBreak} isBreaking={isMining} />
                                    </div>
                                )}
                             </div>
                         ) : isWritingMode ? (
                             <div className="w-full max-w-2xl flex flex-col items-center gap-6">
                                {players.find(p => p.id === currentUser?.id)?.isReady ? (
                                     <div className="text-center animate-pop">
                                        <h4 className="text-6xl font-black uppercase text-green-700 player-name-shadow mb-6">ESCOLHA FEITA!</h4>
                                        <div className="w-32 h-32 bg-green-100 border-8 border-green-700 mx-auto flex items-center justify-center text-7xl shadow-2xl">✅</div>
                                    </div>
                                ) : (
                                    <>
                                        <h4 className="text-4xl font-black uppercase player-name-shadow text-center">Digite sua Escolha:</h4>
                                        <input 
                                            value={customChoice} 
                                            onChange={e => setCustomChoice(e.target.value)} 
                                            className="minecraft-input w-full text-4xl text-center uppercase" 
                                            placeholder="..." 
                                            maxLength={20}
                                        />
                                        <button 
                                            onClick={() => handlePlayerChoice(customChoice)} 
                                            className="minecraft-button w-full py-6 text-4xl animate-gold"
                                            disabled={!customChoice.trim()}
                                        >
                                            ENVIAR RESPOSTA
                                        </button>
                                    </>
                                )}
                             </div>
                         ) : (
                            <div className={`grid gap-6 w-full ${shouldRenderImages(aiData.mode) ? 'grid-cols-2' : 'grid-cols-1 md:grid-cols-2'}`}>
                                {aiData.items.map(item => (
                                    <button 
                                        key={item}
                                        className={`minecraft-button flex flex-col items-center gap-4 transition-all p-8 ${players.find(p => p.id === currentUser?.id)?.currentChoice === item ? 'bg-[#fceb83] ring-8 ring-[#3e2723] -translate-y-2 shadow-2xl' : ''}`}
                                        onClick={() => handlePlayerChoice(item)}
                                    >
                                        {shouldRenderImages(aiData.mode) ? (
                                            <MinecraftItemImage itemName={item} />
                                        ) : (
                                            <span className="text-4xl font-black uppercase tracking-tighter">{item}</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                         )}
                    </div>
                )}
            </div>
          </div>
        )}

        {gameState === GameState.REVEAL_SEQUENCE && (
            <div className="w-full h-full flex flex-col items-center py-4 space-y-6 overflow-hidden animate-in fade-in">
                <h2 className="text-5xl font-black uppercase tracking-tighter player-name-shadow">O JULGAMENTO</h2>
                
                <div className="flex-1 w-full max-w-2xl space-y-4 px-4 overflow-y-auto">
                    {players.filter(p => !p.isHost).map(p => (
                        <div key={p.id} className="bg-white p-6 border-6 border-[#3e2723] shadow-2xl flex flex-col gap-4">
                             <div className="flex justify-between items-center text-2xl border-b-4 border-black/10 pb-2">
                                <span className="font-black uppercase tracking-tight">{p.name}</span>
                                {currentUser?.isHost && !p.isRevealed && (
                                    <button onClick={() => revealPlayer(p.id)} className="minecraft-button px-6 py-2 text-xl font-black uppercase animate-pulse shadow-xl">
                                        REVELAR
                                    </button>
                                )}
                             </div>
                             <div className={`text-center py-8 border-6 border-dashed border-[#3e2723]/20 flex flex-col items-center justify-center gap-4 ${p.isRevealed ? 'bg-[#fceb83] border-[#b08d0a] shadow-inner' : 'bg-black/5'}`}>
                                {p.isRevealed ? (
                                    <>
                                        {aiData && shouldRenderImages(aiData.mode) && <MinecraftItemImage itemName={p.currentChoice} className="scale-125" />}
                                        <span className="text-6xl font-black uppercase animate-pop text-[#3e2723] player-name-shadow break-words max-w-full px-4">{p.currentChoice || 'VAZIO'}</span>
                                    </>
                                ) : (
                                    <span className="text-7xl font-black uppercase opacity-10 tracking-widest">??????</span>
                                )}
                             </div>
                        </div>
                    ))}
                </div>

                {currentUser?.isHost && (
                    <button onClick={() => { setGameState(GameState.ROUND_RESULT); broadcastState({ gameState: GameState.ROUND_RESULT }); }} className="minecraft-button w-full max-w-sm py-6 text-4xl animate-gold shadow-2xl">
                        APLICAR DANO
                    </button>
                )}
            </div>
        )}

        {gameState === GameState.ROUND_RESULT && (
            <div className="w-full h-full flex flex-col items-center py-4 space-y-6 overflow-y-auto animate-in slide-in-from-bottom">
                <h2 className="text-5xl font-black uppercase border-b-6 border-[#3e2723] pb-2 tracking-tighter player-name-shadow">RESULTADO</h2>
                
                {currentUser?.isHost ? (
                    <div className="w-full space-y-6 px-4 flex-1 max-w-2xl">
                        {players.filter(p => !p.isHost).map(p => (
                            <div key={p.id} className="bg-white/95 p-6 border-8 border-[#3e2723] flex flex-col gap-4 shadow-2xl relative overflow-hidden">
                                {p.lives === 0 && <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center z-20"><div className="border-8 border-red-700 p-6 text-red-700 bg-white font-black text-6xl -rotate-12 shadow-2xl">MORREU</div></div>}
                                <div className="flex justify-between items-center">
                                    <span className="font-black uppercase text-4xl tracking-tighter">{p.name}</span>
                                    <div className="flex items-center gap-3 bg-black/10 p-3 border-4 border-black/20">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Heart key={i} filled={i < p.lives} isAnimated={i === p.lives - 1} />
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between bg-[#3e2723]/5 p-4 border-4 border-[#3e2723]/20">
                                    <span className="text-2xl font-black uppercase truncate max-w-[200px]">Choice: {p.currentChoice || '---'}</span>
                                    <div className="flex items-center gap-6">
                                        <button onClick={() => adjustLife(p.id, -1)} className="minecraft-button w-14 h-14 text-4xl shadow-xl">-</button>
                                        <button onClick={() => adjustLife(p.id, 1)} className="minecraft-button w-14 h-14 text-4xl shadow-xl">+</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <button onClick={startNewRound} className="minecraft-button w-full py-6 text-4xl mt-4 animate-gold shadow-2xl">PRÓXIMA RODADA</button>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-4 w-full">
                        <MLGWaiting />
                        <div className="w-full max-w-md mt-10 space-y-4 p-8 bg-[#3e2723]/5 border-6 border-dashed border-[#3e2723]/20 shadow-inner">
                            <h4 className="text-3xl font-black uppercase text-center border-b-4 border-[#3e2723]/15 pb-2 tracking-[0.2em]">PLACAR</h4>
                            {players.filter(p => !p.isHost).map(p => (
                                <div key={p.id} className={`flex justify-between items-center border-b-2 border-black/10 pb-4 text-2xl ${p.lives === 0 ? 'opacity-30 grayscale' : ''}`}>
                                    <span className="font-black uppercase tracking-tighter">{p.name}</span>
                                    <div className="flex gap-2">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                            <Heart key={i} filled={i < p.lives} isAnimated={true} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        )}

        </div>
      </div>
    </div>
  );
};

export default App;
