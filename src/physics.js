import {config as c} from './config.js';
export class Shot {
 constructor(){this.reset();}
 reset(){this.phase='ready';this.ball={...c.initial,vx:0,vy:0};this.time=0;this.scored=false;this.result=null;this.contacts=new Set();}
 shoot(){if(this.phase!=='ready')return false;this.phase='windup';this.time=0;return true;}
 step(dt){this.time+=dt;if(this.phase==='windup'){if(this.time>=c.windup){this.phase='flight';this.time=0;this.ball={...c.initial,vx:c.force*Math.cos(c.angle),vy:c.force*Math.sin(c.angle)};}return;}
 if(this.phase==='result'){if(this.time>=c.resetDelay)this.reset();return;}
 if(this.phase!=='flight')return;
 const b=this.ball,prev={x:b.x,y:b.y};b.vy-=c.gravity*dt;b.x+=b.vx*dt;b.y+=b.vy*dt;
 // Swept board face: handles either direction without tunnelling.
 const board=c.board,r=c.ballRadius;
 if(b.y+r>board.bottom&&b.y-r<board.top){const face=b.vx>0?board.x-r:board.x+r;if((prev.x-face)*(b.x-face)<=0&&Math.abs(b.vx)>0){b.x=face;b.vx*=-c.restitution;this.contacts.add('board');}}
 for(const x of [c.hoop.x-c.hoop.radius,c.hoop.x+c.hoop.radius]){const dx=b.x-x,dy=b.y-c.hoop.y,d=Math.hypot(dx,dy),rr=r+c.hoop.tube;if(d<rr&&d>0){const nx=dx/d,ny=dy/d,v=b.vx*nx+b.vy*ny;b.x=x+nx*rr;b.y=c.hoop.y+ny*rr;if(v<0){b.vx-=(1+c.restitution)*v*nx;b.vy-=(1+c.restitution)*v*ny;}this.contacts.add('rim');}}
 if(!this.scored&&prev.y>c.hoop.y&&b.y<=c.hoop.y&&b.vy<0){const t=(prev.y-c.hoop.y)/(prev.y-b.y),cross=prev.x+(b.x-prev.x)*t;if(Math.abs(cross-c.hoop.x)<c.hoop.radius-r){this.scored=true;this.result='¡Canasta!';}}
 if(b.y<r){b.y=r;b.vy=Math.abs(b.vy)*c.restitution;b.vx*=.8;this.contacts.add('floor');if(!this.result)this.result='Inténtalo de nuevo';}
 if(this.time>=c.maxFlight||(this.result&&this.contacts.has('floor'))){this.result??='Inténtalo de nuevo';this.phase='result';this.time=0;}
 }
}
