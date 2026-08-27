<?php

require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');


// ==========================================
// FUNÇÃO DE RESPOSTA
// ==========================================

function responder($ok, $mensagem, $dados = [])
{
    echo json_encode(
        array_merge(
            [
                'ok' => $ok,
                'mensagem' => $mensagem
            ],
            $dados
        ),
        JSON_UNESCAPED_UNICODE
    );

    exit;
}


// ==========================================
// RECEBER JSON
// ==========================================

$input = file_get_contents('php://input');

$data = json_decode(
    $input,
    true
);

if (!$data) {

    responder(
        false,
        'Dados inválidos.'
    );

}


// ==========================================
// TELEGRAM INIT DATA
// ==========================================

$initData =
    $data['initData'] ?? '';

$doramaId =
    intval(
        $data['dorama_id'] ?? 0
    );


if (!$initData || !$doramaId) {

    responder(
        false,
        'Dados incompletos.'
    );

}


// ==========================================
// VALIDAR TELEGRAM
// ==========================================

$telegramUser =
    validarTelegramInitData(
        $initData
    );


if (!$telegramUser) {

    responder(
        false,
        'Sessão do Telegram inválida.'
    );

}


// ==========================================
// PEGAR DORAMA
// ==========================================

$dorama =
    supabaseRequest(
        'GET',
        '/rest/v1/doramas?id=eq.' .
        $doramaId .
        '&ativo=eq.true&select=id,titulo,preco'
    );


if (
    !is_array($dorama) ||
    count($dorama) === 0
) {

    responder(
        false,
        'Dorama não encontrado.'
    );

}


$dorama =
    $dorama[0];


// ==========================================
// DADOS DO USUÁRIO
// ==========================================

$telegramId =
    (string)$telegramUser['id'];

$username =
    $telegramUser['username']
    ?? '';

$firstName =
    $telegramUser['first_name']
    ?? '';

$lastName =
    $telegramUser['last_name']
    ?? '';

$nome =
    trim(
        $firstName .
        ' ' .
        $lastName
    );


// ==========================================
// VERIFICAR COMPRA EXISTENTE
// ==========================================

$existente =
    supabaseRequest(
        'GET',
        '/rest/v1/compras' .
        '?telegram_id=eq.' .
        urlencode($telegramId) .
        '&dorama_id=eq.' .
        $doramaId .
        '&status=eq.pendente' .
        '&select=*'
    );


if (
    is_array($existente) &&
    count($existente) > 0
) {

    $compra =
        $existente[0];

    enviarSolicitacaoTelegram(
        $compra,
        $dorama,
        $telegramUser
    );

    responder(
        true,
        'Sua solicitação já está registrada.',
        [
            'compra_id' =>
                $compra['id']
        ]
    );

}


// ==========================================
// CRIAR COMPRA
// ==========================================

$compra =
    supabaseRequest(
        'POST',
        '/rest/v1/compras',
        [
            'telegram_id' =>
                $telegramId,

            'telegram_username' =>
                $username,

            'telegram_nome' =>
                $nome,

            'dorama_id' =>
                $doramaId,

            'valor' =>
                $dorama['preco'],

            'status' =>
                'pendente'
        ]
    );


if (
    !is_array($compra) ||
    count($compra) === 0
) {

    responder(
        false,
        'Não foi possível registrar o pagamento.'
    );

}


$compra =
    $compra[0];


// ==========================================
// AVISAR ADMIN
// ==========================================

enviarSolicitacaoTelegram(
    $compra,
    $dorama,
    $telegramUser
);


responder(
    true,
    'Solicitação enviada.',
    [
        'compra_id' =>
            $compra['id']
    ]
);



// ==================================================
// VALIDAR TELEGRAM WEB APP INIT DATA
// ==================================================

function validarTelegramInitData(
    $initData
) {

    parse_str(
        $initData,
        $dados
    );


    if (
        !isset(
            $dados['hash']
        )
    ) {

        return false;

    }


    $hash =
        $dados['hash'];

    unset(
        $dados['hash']
    );


    ksort($dados);


    $dataCheckString =
        implode(
            "\n",
            array_map(
                function ($key) use ($dados) {

                    return
                        $key .
                        '=' .
                        $dados[$key];

                },
                array_keys($dados)
            )
        );


    $secretKey =
        hash_hmac(
            'sha256',
            BOT_TOKEN,
            'WebAppData',
            true
        );


    $calculatedHash =
        hash_hmac(
            'sha256',
            $dataCheckString,
            $secretKey
        );


    if (
        !hash_equals(
            $calculatedHash,
            $hash
        )
    ) {

        return false;

    }


    if (
        !isset(
            $dados['user']
        )
    ) {

        return false;

    }


    $user =
        json_decode(
            $dados['user'],
            true
        );


    if (!$user) {

        return false;

    }


    return $user;

}



// ==================================================
// SUPABASE REST
// ==================================================

function supabaseRequest(
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


    curl_setopt(
        $ch,
        CURLOPT_RETURNTRANSFER,
        true
    );


    curl_setopt(
        $ch,
        CURLOPT_CUSTOMREQUEST,
        $method
    );


    curl_setopt(
        $ch,
        CURLOPT_HTTPHEADER,
        $headers
    );


    if ($body !== null) {

        curl_setopt(
            $ch,
            CURLOPT_POSTFIELDS,
            json_encode(
                $body,
                JSON_UNESCAPED_UNICODE
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
            'Supabase error: ' .
            $response
        );

        return null;

    }


    return json_decode(
        $response,
        true
    );

}



// ==================================================
// ENVIAR SOLICITAÇÃO PARA O ADMIN
// ==================================================

function enviarSolicitacaoTelegram(
    $compra,
    $dorama,
    $usuario
) {

    $nome =
        trim(
            ($usuario['first_name'] ?? '') .
            ' ' .
            ($usuario['last_name'] ?? '')
        );


    $username =
        $usuario['username']
        ?? 'sem_username';


    $texto =
        "🔔 <b>NOVA SOLICITAÇÃO DE PAGAMENTO</b>\n\n" .

        "🎬 <b>Dorama:</b> " .
        htmlspecialchars(
            $dorama['titulo'],
            ENT_QUOTES,
            'UTF-8'
        ) .
        "\n\n" .

        "💰 <b>Valor:</b> R$ " .
        number_format(
            (float)$compra['valor'],
            2,
            ',',
            '.'
        ) .
        "\n\n" .

        "👤 <b>Usuário:</b> " .
        htmlspecialchars(
            $nome,
            ENT_QUOTES,
            'UTF-8'
        ) .
        "\n" .

        "🆔 <b>Telegram ID:</b> " .
        htmlspecialchars(
            (string)$usuario['id'],
            ENT_QUOTES,
            'UTF-8'
        ) .
        "\n" .

        "📱 <b>Username:</b> @" .
        htmlspecialchars(
            $username,
            ENT_QUOTES,
            'UTF-8'
        ) .
        "\n\n" .

        "🧾 <b>Compra:</b> #" .
        $compra['id'];


    $keyboard = [

        [

            [

                'text' =>
                    '✅ LIBERAR',

                'callback_data' =>
                    'liberar:' .
                    $compra['id']

            ],

            [

                'text' =>
                    '❌ RECUSAR',

                'callback_data' =>
                    'recusar:' .
                    $compra['id']

            ]

        ]

    ];


    telegramRequest(
        'sendMessage',
        [

            'chat_id' =>
                ADMIN_CHAT_ID,

            'text' =>
                $texto,

            'parse_mode' =>
                'HTML',

            'reply_markup' =>
                json_encode(
                    [
                        'inline_keyboard' =>
                            $keyboard
                    ],
                    JSON_UNESCAPED_UNICODE
                )

        ]
    );

}



// ==================================================
// TELEGRAM REQUEST
// ==================================================

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