<?php

// ==========================================
// CONFIGURAÇÃO
// ==========================================

require_once __DIR__ . '/config.php';


// ==========================================
// PROTEÇÃO DO WEBHOOK
// ==========================================

$key = $_GET['key'] ?? '';

if ($key !== WEBHOOK_SECRET) {

    http_response_code(403);

    exit('Acesso negado.');

}


// ==========================================
// RECEBER ATUALIZAÇÃO DO TELEGRAM
// ==========================================

$input = file_get_contents('php://input');

if (!$input) {

    echo 'Bot online.';

    exit;

}


$update = json_decode(
    $input,
    true
    
);



if (!$update) {

    echo 'OK';

    exit;

}

// ==========================================
// CALLBACK DOS BOTÕES
// ==========================================

$callback =
    $update['callback_query']
    ?? null;


if ($callback) {

    processarCallback(
        $callback
    );

    echo 'OK';

    exit;

}

// ==========================================
// VERIFICAR MENSAGEM
// ==========================================

$message = $update['message'] ?? null;


if (!$message) {

    echo 'OK';

    exit;

}


$chatId =
    $message['chat']['id'] ?? null;


$text =
    trim($message['text'] ?? '');


$user =
    $message['from'] ?? [];


// ==========================================
// /START
// ==========================================

if (
    $text === '/start' ||
    strpos($text, '/start ') === 0
) {

    enviarMensagem(
        $chatId,

        "🎬 <b>Bem-vindo ao DoramaFlix!</b>\n\n" .
        "Encontre seus doramas favoritos e tenha acesso ao conteúdo completo após a compra.\n\n" .
        "Clique no botão abaixo para abrir o catálogo.",

        [

            [
                [
                    'text' => '🎬 Abrir Catálogo',

                    'web_app' => [
                        'url' => MINI_APP_URL
                    ]
                ]
            ]

        ]
    );

}


// ==========================================
// OUTRAS MENSAGENS
// ==========================================

else {

    enviarMensagem(
        $chatId,

        "Olá! 👋\n\n" .
        "Use o botão abaixo para acessar nosso catálogo.",

        [

            [
                [
                    'text' => '🎬 Abrir Catálogo',

                    'web_app' => [
                        'url' => MINI_APP_URL
                    ]
                ]
            ]

        ]
    );

}


echo 'OK';


// ==========================================
// FUNÇÃO ENVIAR MENSAGEM
// ==========================================

function enviarMensagem(
    $chatId,
    $texto,
    $keyboard = null
) {

    $url =
        'https://api.telegram.org/bot' .
        BOT_TOKEN .
        '/sendMessage';


    $dados = [

        'chat_id' => $chatId,

        'text' => $texto,

        'parse_mode' => 'HTML'

    ];


    if ($keyboard !== null) {

        $dados['reply_markup'] =
            json_encode(
                [
                    'inline_keyboard' =>
                        $keyboard
                ],
                JSON_UNESCAPED_UNICODE
            );

    }


    $ch = curl_init($url);


    curl_setopt_array(
        $ch,
        [

            CURLOPT_POST => true,

            CURLOPT_POSTFIELDS =>
                http_build_query($dados),

            CURLOPT_RETURNTRANSFER => true,

            CURLOPT_TIMEOUT => 20,

            CURLOPT_SSL_VERIFYPEER => true

        ]
    );


    $resultado =
        curl_exec($ch);


    $erro =
        curl_error($ch);


    curl_close($ch);


    if ($erro) {

        error_log(
            'Telegram CURL Error: ' .
            $erro
        );

    }


    return $resultado;

}
// ==========================================
// PROCESSAR BOTÃO ADMIN
// ==========================================

function processarCallback(
    $callback
) {

    $adminChatId =
        (string)(
            $callback['message']['chat']['id']
            ?? ''
        );


    // Somente você pode usar os botões

    if (
        $adminChatId !==
        (string)ADMIN_CHAT_ID
    ) {

        responderCallback(
            $callback['id'],
            'Acesso negado.'
        );

        return;

    }


    $data =
        $callback['data']
        ?? '';


    if (
        !preg_match(
            '/^(liberar|recusar):(\d+)$/',
            $data,
            $matches
        )
    ) {

        responderCallback(
            $callback['id'],
            'Comando inválido.'
        );

        return;

    }


    $acao =
        $matches[1];

    $compraId =
        (int)$matches[2];


    if (
        $acao === 'liberar'
    ) {

        liberarCompra(
            $callback,
            $compraId
        );

        return;

    }


    if (
        $acao === 'recusar'
    ) {

        recusarCompra(
            $callback,
            $compraId
        );

        return;

    }

}



// ==========================================
// LIBERAR COMPRA
// ==========================================

function liberarCompra(
    $callback,
    $compraId
) {

    $compra =
        supabaseRequestWebhook(
            'GET',
            '/rest/v1/compras?id=eq.' .
            $compraId .
            '&select=*'
        );


    if (
        !$compra ||
        count($compra) === 0
    ) {

        responderCallback(
            $callback['id'],
            'Compra não encontrada.'
        );

        return;

    }


    $compra =
        $compra[0];


    if (
        $compra['status'] === 'pago'
    ) {

        responderCallback(
            $callback['id'],
            'Esta compra já foi liberada.'
        );

        return;

    }


    $resultado =
        supabaseRequestWebhook(
            'PATCH',
            '/rest/v1/compras?id=eq.' .
            $compraId,
            [

                'status' =>
                    'pago',

                'paid_at' =>
                    date(
                        'c'
                    )

            ]
        );


    if ($resultado === null) {

        responderCallback(
            $callback['id'],
            'Erro ao liberar.'
        );

        return;

    }


    responderCallback(
        $callback['id'],
        'Dorama liberado!'
    );


    // Atualizar mensagem do admin

    editarMensagemAdmin(
        $callback,
        '🟢 <b>DORAMA LIBERADO</b>'
    );


    // Avisar usuário

    enviarMensagem(
        $compra['telegram_id'],
        "🎉 <b>Pagamento confirmado!</b>\n\n" .
        "🔓 Seu dorama foi liberado.\n\n" .
        "Clique abaixo para assistir ao dorama completo.",
        [

            [

                [

                    'text' =>
                        '▶️ Assistir Dorama',

                    'web_app' =>
                        [

                            'url' =>
                                MINI_APP_URL

                        ]

                ]

            ]

        ]
    );

}



// ==========================================
// RECUSAR
// ==========================================

function recusarCompra(
    $callback,
    $compraId
) {

    $compra =
        supabaseRequestWebhook(
            'GET',
            '/rest/v1/compras?id=eq.' .
            $compraId .
            '&select=*'
        );


    if (
        !$compra ||
        count($compra) === 0
    ) {

        responderCallback(
            $callback['id'],
            'Compra não encontrada.'
        );

        return;

    }


    supabaseRequestWebhook(
        'PATCH',
        '/rest/v1/compras?id=eq.' .
        $compraId,
        [

            'status' =>
                'recusado',

            'recusado_at' =>
                date('c')

        ]
    );


    responderCallback(
        $callback['id'],
        'Solicitação recusada.'
    );


    editarMensagemAdmin(
        $callback,
        '🔴 <b>PAGAMENTO RECUSADO</b>'
    );


    enviarMensagem(
        $compra[0]['telegram_id'],
        "❌ <b>Pagamento não confirmado.</b>\n\n" .
        "Sua solicitação foi recusada."
    );

}



// ==========================================
// SUPABASE NO WEBHOOK
// ==========================================

function supabaseRequestWebhook(
    $method,
    $endpoint,
    $body = null
) {

    $url =
        SUPABASE_URL .
        $endpoint;


    $headers = [

        'apikey: ' .
        SUPABASE_SERVICE_KEY,

        'Authorization: Bearer ' .
        SUPABASE_SERVICE_KEY,

        'Content-Type: application/json',

        'Prefer: return=representation'

    ];


    $ch =
        curl_init($url);


    curl_setopt_array(
        $ch,
        [

            CURLOPT_RETURNTRANSFER =>
                true,

            CURLOPT_CUSTOMREQUEST =>
                $method,

            CURLOPT_HTTPHEADER =>
                $headers,

            CURLOPT_TIMEOUT =>
                20

        ]
    );


    if ($body !== null) {

        curl_setopt(
            $ch,
            CURLOPT_POSTFIELDS,
            json_encode(
                $body
            )
        );

    }


    $response =
        curl_exec($ch);


    $httpCode =
        curl_getinfo(
            $ch,
            CURLINFO_HTTP_CODE
        );


    curl_close($ch);


    if (
        $httpCode < 200 ||
        $httpCode >= 300
    ) {

        error_log(
            'Supabase: ' .
            $response
        );

        return null;

    }


    return json_decode(
        $response,
        true
    );

}



// ==========================================
// RESPONDER CALLBACK
// ==========================================

function responderCallback(
    $callbackId,
    $texto
) {

    telegramRequest(
        'answerCallbackQuery',
        [

            'callback_query_id' =>
                $callbackId,

            'text' =>
                $texto

        ]
    );

}



// ==========================================
// EDITAR MENSAGEM DO ADMIN
// ==========================================

function editarMensagemAdmin(
    $callback,
    $novoTexto
) {

    $chatId =
        $callback['message']['chat']['id'];

    $messageId =
        $callback['message']['message_id'];


    telegramRequest(
        'editMessageText',
        [

            'chat_id' =>
                $chatId,

            'message_id' =>
                $messageId,

            'text' =>
                $novoTexto,

            'parse_mode' =>
                'HTML'

        ]
    );

}



// ==========================================
// TELEGRAM REQUEST
// ==========================================

function telegramRequest(
    $method,
    $data
) {

    $url =
        'https://api.telegram.org/bot' .
        BOT_TOKEN .
        '/' .
        $method;


    $ch =
        curl_init($url);


    curl_setopt_array(
        $ch,
        [

            CURLOPT_POST =>
                true,

            CURLOPT_POSTFIELDS =>
                http_build_query(
                    $data
                ),

            CURLOPT_RETURNTRANSFER =>
                true,

            CURLOPT_TIMEOUT =>
                20,

            CURLOPT_SSL_VERIFYPEER =>
                true

        ]
    );


    $response =
        curl_exec($ch);


    curl_close($ch);


    return $response;

}