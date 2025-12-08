<?php

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $challenge = $_GET['hub_challenge'] ?? $_GET['hub.challenge'] ?? null;
    $verify = $_GET['hub_verify_token'] ?? $_GET['hub.verify_token'] ?? null;

    if ($verify === 'azera123') {
        echo $challenge;
        exit;
    }

    http_response_code(403);
    echo "Token inválido";
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    file_put_contents('facebook_log.txt', file_get_contents('php://input'));
    http_response_code(200);
    exit;
}
