export function camera(canvas){const w=canvas.clientWidth,h=canvas.clientHeight;const scale=Math.min(w/9.2,h/4.9);return {w,h,s:scale,point:(x,y)=>[w/2+(x-4.4)*scale,h*.86-y*scale]};}
