export function bindControls(button,shot){button.addEventListener('click',()=>shot.shoot());return ()=>{button.disabled=shot.phase!=='ready';};}
