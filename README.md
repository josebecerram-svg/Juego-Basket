# Baseline · prototipo 15 · Arena PBR y personajes GLTF

## Novedades de la versión 15

La escena usa humanos GLTF con esqueleto y `AnimationMixer`, en lugar de personajes construidos con primitivas. Se incluye un avatar de demostración y una biblioteca de movimiento de los ejemplos oficiales de Three.js; los estados deportivos ausentes usan poses originales de demostración. Las rutas de los modelos, nombres de clips y adaptación de huesos están en `src/graphics/settings.js`. Estos recursos no son escaneos fotorrealistas ni animaciones deportivas con captura de movimiento: sustitúyelos por recursos de producción para alcanzar ese acabado. Ver [procedencia y sustitución de recursos](assets/README.md).

El pabellón rodea la cancha con gradas, público instanciado, anillo superior, techo y cerchas, paneles LED animados, marcador central, canastas de metal y vidrio y redes amortiguadas que reaccionan al enceste. La madera usa una textura procedural 2048 × 4096 con pintura y líneas, mapa de rugosidad y barniz físico (`clearcoat: 1`, `clearcoatRoughness: 0.1`). El perfil alto añade reflejo planar en tiempo real, GTAO, bloom con umbral 0.85, sombras principales 4096 y ACES con exposición 1.2. Un HDR local sintético de interior se carga mediante RGBELoader y PMREM; puede sustituirse por un HDRI fotográfico con licencia. La profundidad de campo es opcional.

**Calidad visual:** abre los ajustes de calidad y elige Automática, Alta, Equilibrada o Baja. Automática empieza equilibrada en GPU convencional y baja en renderizadores por software, y reduce calidad si persisten los fotogramas lentos. El perfil bajo reduce resolución y público y desactiva efectos costosos. Los valores de FPS son observados, no una garantía: 60 FPS dependen de la GPU, resolución y recursos definitivos. El navegador debe soportar WebGL 2. Los controles, colisiones, IA, pases, clavada automática y pausa conservan la lógica de la versión 14.

`createScene(canvas)` es ahora asíncrona. Para integrarla, consulta [los módulos gráficos](src/graphics/README.md). No requiere instalar paquetes ni compilar: el motor y sus addons 0.170.0 están incluidos localmente. Los cambios de recursos se versionan con `npm run version:assets`.

La batería incluye 72 pruebas: 68 de juego y cuatro de recursos, estados visuales, adaptación de calidad y normalización real de los cuatro esqueletos GLB. La validación de shaders y la inspección de la escena requieren además un navegador WebGL.

## Novedades de la versión 14

El juego inicia con cuatro jugadores originales: Rivera (07) y Silva (12), de rojo, contra Vega (23) y Ríos (31), de azul. Los rivales marcan entre los atacantes y el aro, reaccionan con demora y error, disputan tiros, intentan robar y recuperan el balón. Cuando recuperan, avanzan hacia la canasta contraria y pueden lanzar. El marcador rival aparece arriba. No se añaden faltas ni reglas competitivas completas.

**Clavada automática:** con posesión, carrera real de al menos 3,8 m/s y Shift mantenido, pulsa Espacio dentro de la pintura azul de cualquiera de las dos canastas. No necesitas pulsar ni soltar el mouse para activar o completar la animación. La aproximación se guía hasta un punto seguro delante del aro; el brazo derecho extiende el balón y lo suelta en un contacto fijo. El impulso depende de la velocidad al comenzar. Si ya cargabas con clic izquierdo, se conserva esa potencia como fuerza de la clavada; con poca o demasiada fuerza el balón puede golpear el aro. La banda de potencia orienta sobre fuerza, no sobre una ventana temporal. No puedes iniciar otra acción hasta aterrizar. Fuera de estas condiciones, Espacio hace un salto normal y el clic izquierdo conserva el tiro normal.

**Defensa sin balón:** E intenta un robo con preparación y recuperación, a menos de 1 m y mirando al portador; la protección y el momento del bote pueden impedirlo. Ctrl izquierdo mantiene una postura baja con brazos abiertos y orientación al atacante. Mantén clic izquierdo para elevar las manos; combínalo con Espacio para disputar en salto. Q ejecuta un manotazo cercano y orientado: desvía el balón, no entrega posesión automáticamente. Estas teclas conservan pase, pase elevado, protección y tiro cuando llevas el balón.

**Balón vivo:** los fallos y los pases no recibidos dejan el balón en juego. Aunque se detenga en el suelo, no vuelve automáticamente a las manos. Acércate para iniciar una recogida visible de 0,35 s; solo al completarla cambia la posesión. Los cuatro jugadores pueden recogerlo. Si sale completamente de la cancha, se detiene la jugada y aparece «Balón fuera»; Enter o el botón repone el balón.

**Pausa:** Esc detiene simulación, balón, animación e IA y muestra «Reanudar» y «Salir a la práctica». Si el cursor estaba capturado, también lo libera; liberar la captura pausa el juego. Esc o Reanudar continúa, y «Salir a la práctica» retira los defensores. Puedes capturar de nuevo el mouse con su botón. Se mantienen WASD, Shift, apuntado 360°, fijación con clic derecho, E/EE/Q con balón, F y cambio de control al recibir un pase.

La versión 14 incluye 68 pruebas automatizadas. Las comprobaciones de esta versión cubren la aproximación desde varios puntos de ambas pinturas, contacto sin atravesar el tablero, fuerza correcta/insuficiente/excesiva, robo, manotazo, bloqueo de pie y en salto, error de posición, IA, separación, recogida, balón fuera y congelación completa al pausar. Se revisan también escena, clavada y controles reales en Chromium.

Las secciones de versiones anteriores que siguen documentan la evolución del prototipo. La clavada automática y el balón vivo descritos arriba sustituyen la ventana de suelta y la recuperación automática de versiones anteriores.

Práctica de tiros y pases en tercera persona con Three.js, con Rivera (07) y Silva (12). Controlas a quien recibe el pase; el otro jugador actúa como compañero de apoyo de la computadora. Cancha interior de 15 × 28 m, parquet claro generado por código, zonas azules, líneas, dos tableros y aros a 3,05 m y graderías oscuras. La escena se construye con geometría 3D; no contiene una fotografía como fondo.

## Iniciar

En GitHub Pages: https://josebecerram-svg.github.io/Juego-Basket/ . Las actualizaciones pueden tardar unos minutos; si ves una versión anterior, recarga sin caché.

Para desarrollo local: Node.js >=18, `npm run dev` en la carpeta del proyecto, y `http://localhost:5173` en esa misma máquina. No requiere instalación npm ni compilación. En un entorno remoto, localhost solo está disponible dentro de esa máquina. Requiere navegador con WebGL 2.

## Controles

- **W:** avanzar hacia donde mira el personaje. **S:** retroceder. **A/D:** desplazarse a izquierda/derecha respecto a esa orientación. El movimiento limita aceleración, frenado y variación de aceleración, con giros progresivos y diagonales normalizadas. Mantener WASD mezcla caminar y trotar; **Shift** permite correr más rápido con aceleración gradual; los desplazamientos laterales y hacia atrás conservan un ritmo más corto y controlado. Se mantienen los límites de la cancha. El cuerpo acompaña la velocidad lateral y de retroceso; los pies mantienen puntos de apoyo en el mundo y alternan las zancadas.
- **Mueve el mouse sobre la cancha:** orientación relativa sin límite horizontal; puedes acumular vueltas completas. La elevación del tiro conserva su rango de 40–70°. La cámara sigue cerca, detrás y en tercera persona. **Capturar mouse · 360°** permite movimientos continuos sin alcanzar el borde del escritorio; **Esc** lo libera para usar la interfaz. La captura es opcional y requiere pulsar su botón. Sin captura puedes volver a entrar en la cancha y continuar orientando mediante nuevos movimientos.
- **Mantén clic izquierdo sobre la cancha:** carga potencia. **Suéltalo:** animación y lanzamiento. El tiro normal carga hasta el máximo en 1,6 segundos. La clavada usa su propia ventana de potencia/tiempo; ver más abajo. Para usar la interfaz durante la captura, pulsa Esc.
- También puedes ajustar **Dirección/Ángulo** con los deslizadores y mantener/soltar **Lanzar**, utilizable con mouse o pantalla táctil. La potencia se carga solo al mantener el botón izquierdo sobre la cancha o **Lanzar** (también mediante una pulsación táctil sostenida), nunca con E.
- WASD no intercepta escritura ni controles cuando un campo o botón tiene el foco. Haz clic en la cancha para volver a controlarla. Al cambiar de ventana se cancelan la carga y las teclas retenidas.
- Solo hay un balón. Puedes caminar durante la carga y el vuelo; el personaje frena progresivamente durante los 0,28 segundos de preparación y el balón sale desde la posición actual de sus manos. Al terminar el intento aparece **¡Canasta!** o **Fallaste**, y el balón vuelve automáticamente a la posición actual del jugador. No hace falta perseguirlo.

Desde la posición inicial, **dirección 0°, ángulo 55° y potencia cercana al 42 %** permiten practicar una canasta. Al moverte, tendrás que ajustar dirección y potencia. No se muestra flecha de dirección ni parábola predictiva; debes estimar el tiro. El clic derecho fija o libera el aro visible más cercano, sin cargar ni disparar.

## Clavada y fijación del aro · versión 12

**Cómo practicar la clavada:** corre hacia el aro con **Shift + W**, entra en la pintura azul, pulsa **Espacio** y mantén **clic izquierdo**. El salto debe comenzar dentro del rectángulo azul (4,9 × 5,8 m) con posesión, carrera real de al menos 3,8 m/s y el aro a 2,6 m como máximo; al activar la clavada también debe continuar al alcance y dentro de los primeros 450 ms de vuelo. También puedes mantener el clic mientras te aproximas y pulsar Espacio en esas condiciones. Si no las cumples, el clic sigue cargando el tiro normal.

La barra cambia a **CLAVADA · SUELTA EN VERDE**. La zona verde abarca 48–68 % de una carga de 0,8 s (aprox. 0,38–0,54 s desde la activación). Soltar dentro completa la extensión del brazo y coloca la suelta vertical en el centro del aro: la canasta se registra mediante el cruce físico descendente, una sola vez, y suma 2 puntos. Fuera de verde se libera el balón desde las manos con una desviación y sigue las colisiones normales; no se concede la canasta. Mantener más de 1,05 s o cancelar por pérdida de foco hace fallar el intento. No hay otro salto, pase, amague o tiro durante la acción y el aterrizaje. La aproximación, elevación y colocación final de una clavada válida tienen asistencia de animación; no se modifica el apuntado ni la física del tiro normal.

**Clic derecho:** fija el aro visible más cercano dentro de 22 m. Un aviso discreto muestra **ARO FIJADO**; el cuerpo y la cámara lo siguen suavemente mientras WASD mantiene el movimiento. Otro clic derecho libera la mira. Si el aro queda fuera del encuadre, oculto por elementos sólidos del gimnasio o fuera del alcance durante 250 ms, se libera con aviso y transición suave. El tablero transparente permite ver el objetivo. El clic derecho no dispara ni cambia la posesión; la elevación de tiro sigue siendo configurable. No quedan flechas ni trayectorias predictivas en la escena.

Pruebas nuevas cubren ambas canastas, condiciones ausentes, tiro normal de respaldo, sueltas verdes/tempranas/tardías, tiempo agotado/cancelación, manos sincronizadas y aterrizaje. También se verifican vueltas completas acumuladas, elección visible del objetivo, fijación sin tiro y liberación por clic, oclusión o alcance. La revisión en Chromium usa clics y teclas reales, y comprueba la captura opcional y Esc.

## Acciones, bote y salto · versión 11

- **Shift (izquierdo o derecho), mantenido:** acelera hasta 5,6 m/s frente a 3,4 m/s normales. Los pasos se acortan en tiempo y la pelvis baja progresivamente para mantener el alcance de las piernas. Al soltar, se reduce la velocidad gradualmente.
- **Ctrl izquierdo, mantenido:** guarda el balón al costado, cruza el torso y recoge los brazos. En movimiento reduce el ritmo de desplazamiento y el bote queda bajo, cercano al cuerpo. Al soltar recupera la postura gradualmente. Solo funciona con posesión. La práctica no tiene defensores ni robos: se verifica la postura, pero todavía no hay pérdidas ante un rival que permitan medir una ventaja defensiva.
- **Espacio:** flexión de preparación de 120 ms, impulso vertical de 4,5 m/s, vuelo bajo gravedad y absorción del aterrizaje. No admite otro impulso en el aire ni encadena saltos por repetición del teclado. Funciona con y sin balón. El estado de salto pertenece al actor físico y continúa aunque pase a ser IA después de una recepción.
- **F:** amaga sin soltar ni contar un tiro. **F de nuevo**, desplazarse o proteger cancela con recuperación suave; clic izquierdo pasa a la carga desde la altura actual del balón; E/Q preparan un pase desde esa misma posición. Puede convertir una carga en amague sin que soltar luego el mouse produzca un tiro accidental.

Con posesión y movimiento el balón bota a una cadencia que depende de la velocidad, se separa de la mano y toca el suelo. La mano no persigue al balón hasta el suelo ni estira el brazo. Al parar, saltar o preparar otra acción se recoge progresivamente; durante protección el bote es más bajo. El bote de posesión es una trayectoria coordinada con el movimiento; al soltar un pase o tiro deja de seguir al portador y usa su propia trayectoria. No cuenta como intento ni cambia la posesión.

Las acciones usan `config.controls` y `config.actions`; velocidad de carrera en `config.movement.sprintSpeed`. Los modificadores retenidos se transfieren solo al nuevo controlador; el compañero IA no comparte su conjunto de teclas. Al perder foco se liberan las teclas para evitar acciones retenidas.

## Compañero, recepción y cambio de control

- **E, un toque — Directo:** prepara y pasa al otro jugador. También existe el botón **E Pasar**.
- **EE, dos toques en 260 ms — Con bote:** el segundo toque convierte la preparación en un pase que rebota una sola vez antes de recibir. El primer toque no suelta inmediatamente el balón, por lo que no se crea un segundo pase simultáneo. Mantener E no cuenta como doble toque.
- **Q — Elevado:** preparación sobre la cabeza, arco alto y manos elevadas del receptor. Los tres pases conservan el control hasta confirmar el contacto con el receptor.
- Mientras el pase vuela sigues controlando al pasador. Al comprobar que el balón está dentro del alcance de las manos del receptor, el control pasa a este, sin mover ni intercambiar físicamente a los personajes.
- El receptor continúa el gesto de recepción y queda listo para moverse, apuntar y tirar con los mismos controles. La cámara transiciona hacia él, y la interfaz actualiza nombre y dorsal. Las etiquetas **TÚ / IA** distinguen al controlado y al compañero.
- WASD tiene una sola conexión activa: las teclas que mantengas presionadas se transfieren al receptor, y el jugador anterior conserva su movimiento residual bajo control exclusivo de la computadora. No se envía entrada de usuario a ambos.
- **E** vuelve a pasar al otro jugador y repite el cambio al recibir. No hace falta solicitar una devolución a un compañero que retenga el balón.
- Si el receptor se aparta más allá de la corrección asistida del pase y el balón no llega a sus manos, no cambia el control. El balón cae y se recupera automáticamente tras un breve intervalo. Los pases no cuentan como tiros ni suman puntos.
- No puedes pasar durante un tiro, una carga, otro pase o la recepción; aparece un aviso breve. Mantener E no encadena pases.
- El compañero se recoloca cuando te alejas demasiado o te acercas mucho. El alcance máximo de pase es 12 m.

## Cámara cercana y presentación

La cámara parte a unos **4,6 m detrás** del jugador, a **3 m de altura**, ligeramente a un lado. Sigue desplazamientos, giros y cambios de control mediante amortiguación; no se aleja para encuadrar obligatoriamente a todo el equipo o a un aro que esté detrás. Durante tiros altos puede retroceder ligeramente. La flecha sobre el suelo y la parábola indican la dirección real del lanzamiento, respetando el giro gradual del cuerpo.

Una comprobación de volumen evita que la cámara atraviese tableros, soportes, graderías, paredes o al compañero. Puede acercarse o desplazarse hacia un lado ante un obstáculo, manteniendo una separación de seguridad y la altura por encima de la cabeza. No se cambia a primera persona. Los parámetros están centralizados en `config.camera`.

La ambientación sigue siendo original de Baseline: parquet claro con respuesta de barniz, pintura azul, graderías oscuras, iluminación de gimnasio y sombras suaves. Las camisetas incorporan un tejido procedural fino. Los pasos anticipan los giros y el torso contrarresta la rotación de manera gradual; se conservan los modelos humanos, ritmos de caminar/trotar/correr, apoyos e identidad visual propios.

Los pases, tiros y el cambio automático al receptor no se rediseñan en esta etapa. No se añaden movimientos especiales ni combinaciones. Los movimientos especiales y los diseños futuros de pase/tiro siguen pendientes de instrucciones específicas; el acabado anatómico y las animaciones continúan siendo procedurales, sin captura de movimiento.

## Referencia física · versión 10

La imagen aportada se usa como guía de silueta y equipación, no como imagen del escenario ni como textura fotográfica. Rivera conserva su identidad original, con complexión atlética más robusta, piel oscura, cabello corto texturizado, camiseta roja holgada, shorts oscuros cerca de la rodilla, calcetines y zapatillas oscuros. La camiseta tiene más volumen en el bajo, pliegues con mayor resolución geométrica y ribetes cálidos. Los pantalones siguen la articulación de cada pierna y llevan un dobladillo contrastado. Silva mantiene la equipación azul y se distingue por altura, complexión, tez, peinado y rostro.

No se reproducen el rostro ni otras señas particulares de la persona de la foto. Tampoco se añaden las acciones mostradas en el collage: continúan únicamente desplazamiento, pase, recepción y tiro. Los controles, la física, la cámara y el cambio automático de jugador al recibir se conservan. El modelo continúa siendo procedural y estilizado; la referencia orienta sus proporciones y vestimenta, no implica un acabado fotográfico.

## Gestos continuos · versión 09

Se conservan las identidades originales de Rivera y Silva, con equipaciones marfil/azul sin logotipos; el frontal lleva solo el dorsal. Rivera gana desarrollo atlético proporcionado en hombros y piernas. Ambos usan contornos musculares interpolados, cara esculpida continua (sin esferas superpuestas en mandíbula/pómulos), cavidades orbitales, una línea de cabello más alta y microrrelieve de piel generado localmente. Se mantienen rostros, peinados, colores y estaturas distintos, ropa con pliegues, dedos articulados y zapatillas sin marcas.

**Pase:** E hace frenar gradualmente al pasador y orientar el cuerpo hacia el receptor; la mirada anticipa ese giro. La preparación comienza al completar la mayor parte del giro, lleva el balón al pecho y extiende los brazos. La trayectoria arranca exactamente en el anclaje compartido de las manos. El receptor flexiona las piernas y abre las manos progresivamente, absorbe la recepción y acerca el balón al costado. Cada actor conserva un reloj de gesto propio, por lo que el pasador termina el seguimiento aunque ya sea IA después del cambio de control. Un pase fallido cancela la espera de recepción y no cambia de jugador.

**Tiro:** la profundidad de flexión depende de la carga y se conserva al soltar el botón; incluso un toque breve tiene una pequeña preparación. La extensión de piernas acompaña la elevación del balón hasta la misma salida física anterior. Las palmas se orientan hacia su superficie y conservan el contacto durante toda la preparación. Tras la suelta, la muñeca se flexiona gradualmente, la mano de guía baja antes que el brazo lanzador y la postura se recupera con suavidad. Se mantiene la potencia/dirección elegida y la física de tiro existente; no se añade asistencia para encestar.

`test/animation.test.js` comprueba orientación antes del pase, continuidad del contacto antes/después de la suelta, recepción, fallo sin transferencia, flexión/extensión de piernas y tiros de potencia baja/media/alta en varias direcciones. En Chromium también se miden las palmas renderizadas respecto al balón, se revisan las fases de pase/tiro y se verifican canasta, fallo, movimiento, nombres y cambios de control en ambos sentidos. El acabado continúa siendo procedural y estilizado, sin escaneo facial, simulación de tela ni captura de movimiento; la referencia deportiva es de calidad general y no se usan activos de NBA 2K ni semejanzas de atletas reales.

## Atletas originales · versión 08

Rivera mide 1,96 m y presenta una silueta atlética, piel cálida, cabello corto y camiseta marfil. Silva mide 2,06 m, tiene hombros más anchos, piel oscura, cabello rizado corto, perilla y equipación azul con ribetes arena. Son identidades originales: las referencias generales son la agilidad de un exterior y la presencia física de un jugador interior, sin copiar rostros, nombres, marcas, tatuajes ni uniformes reales.

Las proporciones se ajustan por anatomía, no escalando el modelo completo: se mantienen los pies en el suelo y las manos en las posiciones del balón compartidas con la física. Los contornos musculares, mandíbula, pómulos, párpados, iris, nariz, labios, orejas y cabello están modelados en geometría. Los uniformes incorporan tejido, pliegues suaves y dorsales adaptados a la superficie curva. Las zapatillas tienen collar acolchado, lengüeta, talón, cordones y suela segmentada. Los dedos tienen segmentos articulados que se flexionan al sostener y soltar el balón.

Los hombros acompañan la inclinación y contrarrotación del torso; la mirada sigue el balón durante su vuelo y en el compañero, con giro limitado y amortiguado del cuello y parpadeo desfasado por personaje. Se conservan los apoyos de pies y la mezcla gradual de movimiento. Cada modelo mantiene su identidad al cambiar el control y la interfaz conserva nombre y dorsal del actor activo. No se modifica la física de pases/tiros, la cámara ni los controles.

El acabado es procedural y todavía estilizado: no equivale a un personaje fotorrealista escaneado ni a una animación con captura de movimiento. El detalle facial fino y la deformación de tela mediante simulación quedan pendientes.

## Jugador e interfaz

Adrián Rivera (07) y Mateo Silva (12): modelos humanos procedurales con proporciones anatómicas, rostro, manos, camiseta sin mangas con nombre y dorsal, pantalón, calcetines y zapatillas con suela y cordones. Animaciones articuladas de carrera y frenado, giro al apuntar, flexión de rodillas y elevación del balón al cargar, extensión y gesto de muñeca al soltar. El balón pasa de una posición de preparación al lado del pecho a la posición de salida sobre la cabeza.

La interfaz original **Baseline** integra el marcador arriba a la izquierda y el nombre y potencia abajo a la izquierda. El nombre y dorsal corresponden siempre al jugador controlado. El encuadre inicial reserva espacio para los paneles y un aviso discreto indica la fijación de aro. Cada canasta suma **2 puntos**, una sola vez, inmediatamente al cruzar el aro. El marcador muestra canastas e intentos y conserva el último resultado al recuperar el balón. Los datos duran la sesión actual; recargar la página inicia una práctica nueva.

La potencia es azul en la zona baja, verde lima en la zona ideal y coral en la zona excesiva. La banda ideal se adapta a distancia y elevación; es orientativa y no corrige el apuntado ni garantiza encestar. Al soltar, valor y referencia de potencia quedan fijados hasta que termina el intento. **Ajustes de apuntado** despliega los controles alternativos de dirección/elevación.

## Organización y ajustes

- `src/config.js`: gravedad, fuerza mínima/máxima, carga, elevación, posición inicial, límites de cancha, velocidad/aceleración y asignación WASD configurable.
- `dunk.js`: elegibilidad de salto en pintura, ventana verde, animación asistida y suelta física; `aim.js`: deltas de mouse sin límite y fijación/liberación del aro.
- `actions.js`: salto/aterrizaje por actor, protección y ritmo de bote; `passing.js`: anclajes y trayectorias directa, de bote y elevada.
- `movement.js`: respuesta con límite de aceleración y de su variación, aceleración angular, mezcla progresiva caminar/trotar/correr, lateral y retroceso. Cada actor conserva su propio controlador.
- `footwork.js`: apoyo fijo en el mundo, duración/elevación adaptada al ritmo, curva de pie con llegada suave a una posición de contacto estable, recolocación al detenerse y pasos de giro. Las piernas usan cinemática inversa.
- `practice.js`: actores con identidad estable, transferencia exclusiva de entrada al recibir, compañero de apoyo, vuelo asistido limitado, comprobación de recepción y recuperación de pases fallidos.
- `physics.js`: balón en manos, carga, suelta desde una posición dinámica, trayectoria 3D, colisiones con ambos tableros y aros y suelo. La canasta exige un cruce descendente dentro de la abertura, antes del primer contacto con el suelo, una sola vez por intento.
- `camera.js`: seguimiento cercano desde atrás, amortiguación de posición/giro/altura, volumen de seguridad y alternativas de hombro frente a obstáculos. Prioriza al controlado y evita el zoom panorámico.
- `graphics/arena.js`: parquet PBR, estadio, canastas, gradas, público y pantallas.
- `athletes.js`: perfiles visuales originales, estatura, complexión, rostro y equipación de cada actor.
- `graphics/avatars.js`: carga GLTF, rig, retarget de demostración, materiales, mezcla de clips y cinemática inversa de brazos.
- `pose.js`: preparación, carga, lanzamiento y transición de la postura al correr y detenerse. Comparte la posición del balón con la física.
- `hud.js`: marcador de práctica, último resultado y referencia de potencia según distancia/elevación.
- `controls.js`: teclado, apuntado directo, clic izquierdo y controles alternativos.
- `scene.js` / `main.js`: renderizado y bucle físico a 240 Hz.

## Validación

La batería actual incluye 51 pruebas. Las de la versión 11 comprueban: además de las verificaciones anteriores, comprueba sprint y bote, contacto con el suelo, protección baja, recuperación al parar, salto único con/sin balón, amague/cancelación sin intento, ventana EE, tres vuelos/recepciones y tres pases fallidos sin transferencia. La revisión en Chromium pulsa teclas reales, comprueba la barra de potencia, los cambios de nombre/control, la independencia del tiro durante un salto y la interfaz móvil.


`npm test` ejecuta pruebas de WASD, diagonales, límites y frenado; posición dinámica de salida; tiros corto, largo y lateral; canastas, intentos consecutivos y exclusión de tiros simultáneos; colisiones con suelo/tablero/aro; y cámara cercana en escritorio/móvil: cuerpo visible, distancia, posición detrás y por encima, barrido contra obstáculos y continuidad durante el cambio de control.

Las pruebas cubren continuidad de aceleración y giro, mezcla de ritmos, apoyo sin deslizamiento y llegada suave del pie. Se verifica que no cambie el control antes de recibir, que el receptor herede únicamente la entrada activa, que el pasador sea IA y que un fallo no transfiera control. En Chromium se prueban WASD, E, ambos cambios de jugador, nombres de la interfaz, tiro y canasta con Silva, conservación del marcador y recuperación de un pase fallido. También se revisan caminata, trote, carrera, lateral, retroceso, frenada y giro.

## Límites de las versiones anteriores

Modelo humano procedural estilizado, sin escaneo fotográfico ni captura de movimiento. Los pases tienen asistencia limitada para movimientos pequeños del receptor; no hay interceptaciones ni simulación competitiva de pases. Física de tiro simplificada; red decorativa y sin colisiones con el cuerpo, gradas o paredes. No hay recogida manual: recuperación automática. Movimiento para teclado; móvil conserva puntería y lanzamiento táctiles, sin joystick de desplazamiento. La computadora solo actúa como compañero de práctica; no hay historia, rivales, trucos ni modos multijugador. Three.js 0.170.0 se incluye localmente con su licencia MIT en `vendor/`.

## Publicación y caché

La versión actual incluye un identificador de contenido en CSS, la entrada del juego y todo el grafo de módulos JavaScript, incluyendo Three.js. Así el navegador no mezcla módulos de publicaciones diferentes. El pie de página identifica la versión visible; esta etapa muestra **15**.

Después de modificar archivos, ejecuta `npm run version:assets` y luego `npm test` antes de subir a `main`. `npm run dev` actualiza automáticamente las versiones al arrancar. La comprobación de pruebas detecta recursos modificados sin actualizar su identificador. GitHub Pages sigue publicando desde la raíz de `main`, sin compilación externa. Para una primera carga después de una actualización, añade `?release=IDENTIFICADOR` a la URL del juego; esto renueva el documento HTML además de sus módulos.
