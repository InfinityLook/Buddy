// Tiny original synthesized cues. No audio files, trackers or external services.
let context: AudioContext | null = null
export function playCue(kind:'attack'|'defend'|'reward'|'buddy') {
  try {
    context ??= new AudioContext()
    void context.resume()
    const oscillator=context.createOscillator(),gain=context.createGain()
    oscillator.type=kind==='attack'?'triangle':'sine'
    const start=context.currentTime,freq={attack:180,defend:360,reward:650,buddy:520}[kind]
    oscillator.frequency.setValueAtTime(freq,start);oscillator.frequency.exponentialRampToValueAtTime(freq*(kind==='attack'?.4:1.6),start+.15)
    gain.gain.setValueAtTime(.055,start);gain.gain.exponentialRampToValueAtTime(.001,start+.2)
    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.22)
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect()}
  } catch { /* Audio is optional. */ }
}
