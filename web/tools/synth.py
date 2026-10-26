import json, numpy as np, onnxruntime as ort, subprocess, hashlib, os, re, scipy.io.wavfile as wf
raw="в 0\nя 1\nж 2\nӥ 3\nй 4\nш 5\nӟ 6\nӵ 7\nу 8\nб 9\nи 10\nӝ 11\n- 12\nо 13\nщ 14\nл 15\nп 16\nм 17\nю 18\nц 19\nт 20\n– 21\nд 22\nа 23\nг 24\nэ 25\nк 26\nе 27\nр 28\nё 29\nч 30\nы 32\nь 33\nӧ 34\nс 35\nн 36\n_ 37\nф 38\nъ 39\nз 40\nх 41"
tok={l.split(' ')[0]:int(l.split(' ')[1]) for l in raw.split('\n')}; tok[' ']=31
sess=ort.InferenceSession('model.onnx',providers=['CPUExecutionProvider'])
def ids(text):
    t=text.lower().replace('…','').replace('«','').replace('»','')
    out=[]
    for c in t:
        if c in tok: out.append(tok[c])
        elif c in '.,!?:;': out.append(tok[' '])  # пауза
        elif c==' ' or c=='\n': out.append(tok[' '])
    # схлопнуть повторные пробелы
    res=[]
    for i in out:
        if i==31 and res and res[-1]==31: continue
        res.append(i)
    while res and res[-1]==31: res.pop()
    x=[0]
    for i in res: x+=[i,0]
    return x
def run(x, ls, ns=0.5, nw=0.7):
    y,d=sess.run(None,{'x':np.array([x],dtype=np.int64),'x_length':np.array([len(x)],dtype=np.int64),
        'noise_scale':np.array([ns],dtype=np.float32),'length_scale':np.array([ls],dtype=np.float32),'noise_scale_w':np.array([nw],dtype=np.float32)})
    return y[0,0], d[0,0]
def split_sent(t):
    parts=re.split(r'(?<=[.!?])\s+',t.strip())
    return [p for p in parts if p]
items=json.load(open('tts/items.json'))
os.makedirs('app/src/audio',exist_ok=True)
manifest={}
for it in items:
    name=hashlib.md5(it['k'].encode()).hexdigest()[:10]
    mp3=f'app/src/audio/{name}.mp3'
    manifest[it['k']]=name
    if os.path.exists(mp3): continue
    ls = 1.25 if it['kind']=='word' else 1.08
    chunks=[]
    for sent in (split_sent(it['t']) if it['kind']=='line' else [it['t']]):
        x=ids(sent)
        best=None
        for trial in range(3):  # несколько попыток — берём самую ровную
            y,d=run(x,ls)
            score=float(np.max(d))
            if best is None or score<best[0]: best=(score,y)
        chunks.append(best[1]); chunks.append(np.zeros(int(16000*0.22),dtype=np.float32))
    y=np.concatenate(chunks[:-1])
    y=y/ (np.max(np.abs(y))+1e-6)*0.9
    wav='tts/tmp.wav'; wf.write(wav,16000,(y*32767).astype(np.int16))
    af="adelay=90|90,highpass=f=80,lowpass=f=6800,deesser=i=0.4,acompressor=threshold=-20dB:ratio=2.5:attack=5:release=80,afade=t=in:d=0.02,areverse,silenceremove=start_periods=1:start_threshold=-48dB,afade=t=in:d=0.08,areverse,apad=pad_dur=0.12,loudnorm=I=-17:TP=-2:LRA=7"
    subprocess.run(['ffmpeg','-y','-loglevel','error','-i',wav,'-af',af,'-ar','22050','-ac','1','-c:a','libmp3lame','-b:a','40k',mp3],check=True)
json.dump(manifest,open('app/src/audio/manifest.json','w'),ensure_ascii=False)
tot=sum(os.path.getsize('app/src/audio/'+f) for f in os.listdir('app/src/audio') if f.endswith('.mp3'))
print(len(manifest),'clips',tot//1024,'KB')
