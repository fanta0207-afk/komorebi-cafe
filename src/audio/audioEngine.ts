export type AudioScene="cafe"|"town"|"forest"|"story"|"drama";
export type SoundEffect="tap"|"navigate"|"page"|"confirm"|"cancel"|"coin"|"heart"|"success"|"error"|"story"|"forest"|"order"|"ready";

export interface AudioSettings {
  bgmEnabled:boolean;
  sfxEnabled:boolean;
  bgmVolume:number;
  sfxVolume:number;
}

export const AUDIO_SETTINGS_KEY="komorebi-cafe-audio-v1";
export const DEFAULT_AUDIO_SETTINGS:AudioSettings={bgmEnabled:true,sfxEnabled:true,bgmVolume:.42,sfxVolume:.68};

const clamp=(value:unknown,fallback:number)=>typeof value==="number"&&Number.isFinite(value)?Math.max(0,Math.min(1,value)):fallback;
export function normalizeAudioSettings(value:unknown):AudioSettings {
  if(!value||typeof value!=="object")return {...DEFAULT_AUDIO_SETTINGS};
  const saved=value as Partial<AudioSettings>;
  return {
    bgmEnabled:typeof saved.bgmEnabled==="boolean"?saved.bgmEnabled:DEFAULT_AUDIO_SETTINGS.bgmEnabled,
    sfxEnabled:typeof saved.sfxEnabled==="boolean"?saved.sfxEnabled:DEFAULT_AUDIO_SETTINGS.sfxEnabled,
    bgmVolume:clamp(saved.bgmVolume,DEFAULT_AUDIO_SETTINGS.bgmVolume),
    sfxVolume:clamp(saved.sfxVolume,DEFAULT_AUDIO_SETTINGS.sfxVolume),
  };
}

type ToneType=OscillatorType;
type SceneScore={bpm:number;root:number;melody:(number|null)[];bass:number[];wave:ToneType;brightness:number};
const SCORES:Record<AudioScene,SceneScore>={
  cafe:{bpm:82,root:60,melody:[7,null,9,7,4,null,2,4,7,null,11,9,7,4,2,null],bass:[0,5,2,7],wave:"triangle",brightness:1800},
  town:{bpm:96,root:62,melody:[0,4,7,null,9,7,4,2,0,null,2,4,7,9,7,null],bass:[0,5,7,4],wave:"triangle",brightness:2300},
  forest:{bpm:72,root:57,melody:[12,null,7,null,9,null,4,null,12,null,14,null,9,7,null,null],bass:[0,3,7,5],wave:"sine",brightness:1250},
  story:{bpm:68,root:60,melody:[4,null,7,null,11,null,9,null,4,null,2,null,7,null,null,null],bass:[0,5,3,4],wave:"sine",brightness:1500},
  drama:{bpm:76,root:55,melody:[0,null,1,null,7,null,6,null,0,null,8,7,3,null,1,null],bass:[0,1,6,5],wave:"triangle",brightness:950},
};

const frequency=(midi:number)=>440*Math.pow(2,(midi-69)/12);

export class KomorebiAudioEngine {
  private context?:AudioContext;
  private musicGain?:GainNode;
  private effectsGain?:GainNode;
  private settings={...DEFAULT_AUDIO_SETTINGS};
  private scene:AudioScene="cafe";
  private timer?:number;
  private beat=0;
  private unlocked=false;

  setSettings(settings:AudioSettings) {
    const wasPlaying=this.settings.bgmEnabled&&this.settings.bgmVolume>0;
    this.settings=normalizeAudioSettings(settings);
    this.applyVolumes();
    const shouldPlay=this.settings.bgmEnabled&&this.settings.bgmVolume>0;
    if(this.unlocked&&wasPlaying!==shouldPlay)this.restartMusic();
  }

  setScene(scene:AudioScene) {
    if(scene===this.scene)return;
    this.scene=scene;
    this.restartMusic();
  }

  async unlock() {
    if(typeof window==="undefined")return;
    this.ensureGraph();
    if(this.context?.state==="suspended")await this.context.resume().catch(()=>undefined);
    if(this.unlocked)return;
    this.unlocked=true;
    this.restartMusic();
  }

  setSuspended(suspended:boolean) {
    if(!this.context)return;
    if(suspended)this.context.suspend().catch(()=>undefined);
    else if(this.unlocked)this.context.resume().catch(()=>undefined);
  }

  play(effect:SoundEffect) {
    if(!this.settings.sfxEnabled||this.settings.sfxVolume<=0||typeof window==="undefined")return;
    this.ensureGraph();
    if(!this.context||!this.effectsGain)return;
    if(this.context.state==="suspended")this.context.resume().catch(()=>undefined);
    const now=this.context.currentTime+.006;
    const tone=(midi:number,delay=0,duration=.12,gain=.12,type:ToneType="sine")=>this.tone(frequency(midi),now+delay,duration,gain,type,this.effectsGain!);
    if(effect==="tap")tone(76,0,.045,.055,"triangle");
    if(effect==="navigate"){tone(67,0,.07,.065,"triangle");tone(74,.055,.1,.055,"sine");}
    if(effect==="page"){tone(72,0,.06,.055,"sine");tone(79,.045,.09,.04,"sine");}
    if(effect==="confirm"){tone(67,0,.08,.08,"triangle");tone(72,.07,.12,.07,"sine");}
    if(effect==="cancel"){tone(69,0,.07,.06,"triangle");tone(62,.055,.11,.05,"sine");}
    // Two inharmonic metal strikes make a dry 「チャッ」 followed by a softer
    // 「リン」. This reads as coins touching rather than a pitched reward jingle.
    if(effect==="coin"){
      this.noise(now,.026,.018,7600);
      for(const [freq,duration,gain] of [[1760,.13,.058],[2860,.105,.038],[4370,.075,.019]] as const)this.tone(freq,now,duration,gain,"sine",this.effectsGain,9000);
      for(const [freq,duration,gain] of [[2140,.22,.044],[3480,.17,.026],[5210,.11,.013]] as const)this.tone(freq,now+.072,duration,gain,"sine",this.effectsGain,10000);
    }
    if(effect==="heart"){tone(72,0,.13,.09,"sine");tone(76,.11,.2,.085,"sine");}
    if(effect==="success"){tone(67,0,.1,.08,"triangle");tone(71,.08,.12,.075,"triangle");tone(74,.17,.24,.07,"sine");}
    if(effect==="error"){tone(58,0,.12,.075,"sawtooth");tone(54,.1,.18,.06,"triangle");}
    if(effect==="story"){tone(72,0,.24,.055,"sine");tone(79,.12,.34,.05,"sine");tone(83,.25,.42,.04,"sine");}
    if(effect==="forest"){this.noise(now,.13,.035,900);tone(79,.04,.22,.065,"sine");}
    if(effect==="order"){tone(79,0,.13,.08,"sine");tone(83,.13,.24,.07,"sine");}
    if(effect==="ready"){tone(76,0,.11,.09,"triangle");tone(81,.1,.13,.08,"triangle");tone(88,.21,.3,.075,"sine");}
  }

  destroy() {
    if(this.timer!==undefined)window.clearInterval(this.timer);
    this.timer=undefined;
    this.context?.close().catch(()=>undefined);
    this.context=undefined;
    this.unlocked=false;
  }

  private ensureGraph() {
    if(this.context)return;
    const AudioContextClass=window.AudioContext;
    if(!AudioContextClass)return;
    const context=new AudioContextClass();
    const compressor=context.createDynamicsCompressor();
    compressor.threshold.value=-18;compressor.knee.value=16;compressor.ratio.value=4;compressor.attack.value=.01;compressor.release.value=.3;
    this.musicGain=context.createGain();this.effectsGain=context.createGain();
    this.musicGain.connect(compressor);this.effectsGain.connect(compressor);compressor.connect(context.destination);
    this.context=context;
    this.applyVolumes();
  }

  private applyVolumes() {
    if(!this.context)return;
    const now=this.context.currentTime;
    this.musicGain?.gain.setTargetAtTime(this.settings.bgmEnabled?this.settings.bgmVolume*.24:0,now,.08);
    this.effectsGain?.gain.setTargetAtTime(this.settings.sfxEnabled?this.settings.sfxVolume*.55:0,now,.025);
  }

  private restartMusic() {
    if(this.timer!==undefined){window.clearInterval(this.timer);this.timer=undefined;}
    this.beat=0;
    if(!this.unlocked||!this.settings.bgmEnabled||this.settings.bgmVolume<=0||!this.context||!this.musicGain)return;
    const score=SCORES[this.scene];
    const stepMs=60_000/score.bpm/2;
    this.musicStep();
    this.timer=window.setInterval(()=>this.musicStep(),stepMs);
  }

  private musicStep() {
    if(!this.context||!this.musicGain||this.context.state!=="running")return;
    const score=SCORES[this.scene],step=this.beat%score.melody.length,now=this.context.currentTime+.03;
    const melody=score.melody[step];
    if(melody!==null)this.tone(frequency(score.root+melody),now,.55,.13,score.wave,this.musicGain,score.brightness);
    if(step%4===0){
      const bass=score.bass[Math.floor(step/4)%score.bass.length];
      this.tone(frequency(score.root-12+bass),now,.95,.095,"sine",this.musicGain,700);
    }
    if(step%8===0){
      const chordRoot=score.root+score.bass[Math.floor(step/4)%score.bass.length];
      const minor=this.scene==="forest"||this.scene==="drama";
      for(const [index,offset] of [0,minor?3:4,7].entries())this.tone(frequency(chordRoot+offset),now+index*.018,1.7,.032,"sine",this.musicGain,score.brightness*.75);
    }
    if(this.scene==="forest"&&step%8===6)this.noise(now,.42,.008,1450,this.musicGain);
    this.beat++;
  }

  private tone(freq:number,start:number,duration:number,volume:number,type:ToneType,destination:AudioNode,brightness=2600) {
    if(!this.context)return;
    const oscillator=this.context.createOscillator(),gain=this.context.createGain(),filter=this.context.createBiquadFilter();
    oscillator.type=type;oscillator.frequency.setValueAtTime(freq,start);
    filter.type="lowpass";filter.frequency.setValueAtTime(brightness,start);filter.Q.value=.55;
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(Math.max(.0001,volume),start+.018);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(filter);filter.connect(gain);gain.connect(destination);
    oscillator.start(start);oscillator.stop(start+duration+.03);
  }

  private noise(start:number,duration:number,volume:number,brightness:number,destination:AudioNode=this.effectsGain!) {
    if(!this.context||!destination)return;
    const length=Math.max(1,Math.floor(this.context.sampleRate*duration)),buffer=this.context.createBuffer(1,length,this.context.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.pow(1-i/length,2);
    const source=this.context.createBufferSource(),filter=this.context.createBiquadFilter(),gain=this.context.createGain();
    source.buffer=buffer;filter.type="lowpass";filter.frequency.value=brightness;gain.gain.value=volume;
    source.connect(filter);filter.connect(gain);gain.connect(destination);source.start(start);
  }
}
