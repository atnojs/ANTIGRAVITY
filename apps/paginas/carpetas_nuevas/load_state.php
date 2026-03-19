<?php
header('Content-Type: application/json; charset=utf-8');

$defaults = [
  'settings' => ['background'=>'','theme'=>'dark','fx'=>'nebula','viewModes'=>[],'savedTagFilters'=>[]],
  'prompts' => [],
  'promptFolders' => []
];

$file = __DIR__.'/data.json';
if (!file_exists($file)) { echo json_encode($defaults); exit; }

$raw = file_get_contents($file);
$data = json_decode($raw, true);
if (!is_array($data)) { echo json_encode($defaults); exit; }

echo json_encode($data, JSON_UNESCAPED_SLASHES);
