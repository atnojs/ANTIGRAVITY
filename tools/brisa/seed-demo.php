<?php
declare(strict_types=1);
if(PHP_SAPI!=='cli'){http_response_code(404);exit;}
require_once dirname(__DIR__, 2) . '/apps/brisa/lib/core.php';
if(query('SELECT COUNT(*) FROM events')->fetchColumn() || query('SELECT COUNT(*) FROM tasks')->fetchColumn() || query('SELECT COUNT(*) FROM notes')->fetchColumn()){echo "La agenda ya tiene contenido. No se añaden ejemplos.\n";exit;}
$today=(new DateTimeImmutable('now',new DateTimeZone(timezone_name())))->format('Y-m-d');
$tomorrow=(new DateTimeImmutable($today))->modify('+1 day')->format('Y-m-d');
$after=(new DateTimeImmutable($today))->modify('+2 days')->format('Y-m-d');
foreach([
    ['Un momento para planificar','09:00','10:00','En casa','sage',$today],
    ['Reunión de proyecto','11:00','12:00','Videollamada','clay',$today],
    ['Un paseo, sin prisas','17:00','18:00','Al aire libre','lavender',$today],
    ['Café con Marta','10:30','11:30','La cafetería de siempre','sage',$tomorrow],
    ['Revisar la propuesta','12:00','13:30','Estudio','clay',$after]
] as [$title,$start,$end,$location,$color,$date]){
    $start=(new DateTimeImmutable($date.'T'.$start,new DateTimeZone(timezone_name())))->format(DATE_ATOM);
    $end=(new DateTimeImmutable($date.'T'.$end,new DateTimeZone(timezone_name())))->format(DATE_ATOM);
    $item=save_item('event',['title'=>$title,'start_at'=>$start,'end_at'=>$end,'location'=>$location,'color'=>$color,'description'=>'Ejemplo para explorar Brisa. Puedes editarlo o eliminarlo.']);
    query('UPDATE events SET demo=1 WHERE id=?',[$item['id']]);
}
foreach([
    ['Enviar la propuesta de diseño',1,$today,$today],
    ['Reservar la revisión del coche',2,$tomorrow,$today],
    ['Preparar las ideas de la semana',2,$after,$today],
    ['Encontrar un libro para el fin de semana',3,null,$tomorrow],
    ['Ordenar las fotos del último viaje',3,null,null]
] as [$title,$priority,$due,$planned]){
    $item=save_item('task',['title'=>$title,'priority'=>$priority,'due_date'=>$due,'planned_date'=>$planned,'description'=>'Ejemplo para explorar Brisa.']);query('UPDATE tasks SET demo=1 WHERE id=?',[$item['id']]);
}
foreach([
    ['Una idea para el próximo proyecto','Un espacio sencillo para reunir referencias, probar ideas y dejar que las cosas buenas encuentren su forma.'],
    ['','Llamar mañana a la floristería para encargar unas flores.'],
    ['Pequeñas cosas que funcionan','Salir a caminar antes de abrir el correo. Dejar una sola tarea importante para la mañana. Hacer sitio para lo inesperado.']
] as [$title,$content]){
    $item=save_item('note',['title'=>$title,'content'=>$content]);query('UPDATE notes SET demo=1 WHERE id=?',[$item['id']]);
}
echo "Ejemplos creados. Todos son editables; no se han añadido grabaciones ficticias.\n";
