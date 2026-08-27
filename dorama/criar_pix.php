<?php



// =====================================================

// CORS

// =====================================================



header("Access-Control-Allow-Origin: *");

header("Access-Control-Allow-Methods: POST, OPTIONS");

header("Access-Control-Allow-Headers: Content-Type, Authorization");

header("Content-Type: application/json; charset=UTF-8");



// Responder ao preflight do navegador

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {

    http_response_code(200);

    exit;

}





// =====================================================

// NÃO MOSTRAR ERROS NA RESPOSTA

// =====================================================



ini_set('display_errors', '0');

error_reporting(E_ALL);





// =====================================================

// CONFIG

// =====================================================



require_once __DIR__ . '/../config.php';





// =====================================================

// FUNÇÃO DE RESPOSTA

// =====================================================



function responder($dados, $codigo = 200)

{

    http_response_code($codigo);



    echo json_encode(

        $dados,

        JSON_UNESCAPED_UNICODE |

        JSON_UNESCAPED_SLASHES

    );



    exit;

}





// =====================================================

// SOMENTE POST

// =====================================================



if ($_SERVER['REQUEST_METHOD'] !== 'POST') {



    responder([

        "sucesso" => false,

        "mensagem" => "Método não permitido."

    ], 405);



}





// =====================================================

// LER JSON

// =====================================================



$entrada = json_decode(

    file_get_contents("php://input"),

    true

);





if (!is_array($entrada)) {



    responder([

        "sucesso" => false,

        "mensagem" => "JSON inválido."

    ], 400);



}





// =====================================================

// DADOS

// =====================================================



$dorama_id =

    isset($entrada['dorama_id'])

        ? intval($entrada['dorama_id'])

        : 0;



$titulo =

    isset($entrada['titulo'])

        ? trim($entrada['titulo'])

        : '';



$valor =

    isset($entrada['valor'])

        ? floatval($entrada['valor'])

        : 0;



$telegram_id =

    isset($entrada['telegram_id'])

        ? trim((string)$entrada['telegram_id'])

        : '';





if ($dorama_id <= 0) {



    responder([

        "sucesso" => false,

        "mensagem" => "Dorama inválido."

    ], 400);



}





if ($valor <= 0) {



    responder([

        "sucesso" => false,

        "mensagem" => "Valor inválido."

    ], 400);



}





if ($telegram_id === '') {



    responder([

        "sucesso" => false,

        "mensagem" => "Telegram ID não informado."

    ], 400);



}





// =====================================================

// ACCESS TOKEN

// =====================================================

//

// IMPORTANTE:

// Use o nome da variável que existe no seu config.php.

//

// Exemplo:

//

// $MERCADOPAGO_ACCESS_TOKEN

//

// =====================================================



if (!defined('MERCADO_PAGO_ACCESS_TOKEN') || !MERCADO_PAGO_ACCESS_TOKEN) {



    responder([

        "sucesso" => false,

        "mensagem" => "Access Token do Mercado Pago não configurado."

    ], 500);



}





$accessToken = MERCADO_PAGO_ACCESS_TOKEN;





// =====================================================

// REFERÊNCIA EXTERNA

// =====================================================



$externalReference =

    "DORAMA_" .

    $dorama_id .

    "_TG_" .

    preg_replace(

        '/[^0-9]/',

        '',

        $telegram_id

    ) .

    "_" .

    bin2hex(

        random_bytes(6)

    );





// =====================================================

// IDEMPOTENCY KEY

// =====================================================



$idempotencyKey =

    bin2hex(

        random_bytes(16)

    );





// =====================================================

// DADOS DO MERCADO PAGO

// =====================================================



$payload = [



    "type" =>

        "online",



    "processing_mode" =>

        "automatic",



    "total_amount" =>

        number_format(

            $valor,

            2,

            '.',

            ''

        ),



    "external_reference" =>

        $externalReference,



    "payer" => [



        "email" =>

            "telegram" .

            $telegram_id .

            "@radiogospelmusic.com.br"



    ],



    "transactions" => [



        "payments" => [



            [



                "amount" =>

                    number_format(

                        $valor,

                        2,

                        '.',

                        ''

                    ),



                "payment_method" => [



                    "id" =>

                        "pix",



                    "type" =>

                        "bank_transfer"



                ]



            ]



        ]



    ]



];





// =====================================================

// CURL

// =====================================================



$ch =

    curl_init(

        "https://api.mercadopago.com/v1/orders"

    );





curl_setopt_array(

    $ch,

    [



        CURLOPT_RETURNTRANSFER =>

            true,



        CURLOPT_POST =>

            true,



        CURLOPT_POSTFIELDS =>

            json_encode(

                $payload,

                JSON_UNESCAPED_UNICODE |

                JSON_UNESCAPED_SLASHES

            ),



        CURLOPT_HTTPHEADER =>

            [



                "Content-Type: application/json",



                "Accept: application/json",



                "Authorization: Bearer " .

                    $accessToken,



                "X-Idempotency-Key: " .

                    $idempotencyKey



            ],



        CURLOPT_TIMEOUT =>

            30



    ]

);





// =====================================================

// EXECUTAR

// =====================================================



$resposta =

    curl_exec($ch);





$erroCurl =

    curl_error($ch);





$httpCode =

    curl_getinfo(

        $ch,

        CURLINFO_HTTP_CODE

    );





curl_close($ch);





// =====================================================

// ERRO CURL

// =====================================================



if ($resposta === false) {



    responder([

        "sucesso" => false,

        "mensagem" =>

            "Erro de comunicação com Mercado Pago.",

        "erro" =>

            $erroCurl

    ], 500);



}





// =====================================================

// DECODIFICAR

// =====================================================



$dados =

    json_decode(

        $resposta,

        true

    );





if (!is_array($dados)) {



    responder([

        "sucesso" => false,

        "mensagem" =>

            "Mercado Pago retornou uma resposta inválida.",

        "resposta" =>

            $resposta

    ], 500);



}





// =====================================================

// ERRO MERCADO PAGO

// =====================================================



if (

    $httpCode < 200 ||

    $httpCode >= 300

) {



    responder([

        "sucesso" => false,

        "mensagem" =>

            "Mercado Pago recusou a criação do PIX.",

        "http_code" =>

            $httpCode,

        "erro" =>

            $dados

    ], $httpCode);



}





// =====================================================

// EXTRAIR PAYMENT

// =====================================================



$payment = null;





if (

    isset(

        $dados['transactions']

        ['payments'][0]

    )

) {



    $payment =

        $dados['transactions']

        ['payments'][0];



}





// =====================================================

// QR CODE

// =====================================================



$qrCode = '';



$qrCodeBase64 = '';



$paymentId = '';



$status = '';





// =====================================================

// PAYMENT ID

// =====================================================



if ($payment) {



    $paymentId =

        $payment['id']

        ?? '';



    $status =

        $payment['status']

        ?? '';



}





// =====================================================

// PAYMENT METHOD

// =====================================================



if ($payment) {



    $paymentMethod =

        $payment['payment_method']

        ?? [];



    $qrCode =

        $paymentMethod['qr_code']

        ?? '';



    $qrCodeBase64 =

        $paymentMethod['qr_code_base64']

        ?? '';



}





// =====================================================

// TICKET URL

// =====================================================



$ticketUrl = '';



if ($payment) {



    $ticketUrl =

        $payment['payment_method']

        ['ticket_url']

        ?? '';



}





// =====================================================

// VERIFICAR QR

// =====================================================



if ($qrCode === '') {



// Registrar a compra antes de devolver o PIX ao Mini App.
$compra = [

    'order_id' => $dados['id'] ?? '',

    'external_reference' => $externalReference,

    'payment_id' => $paymentId ?: null,

    'telegram_id' => $telegram_id,

    'dorama_id' => $dorama_id,

    'valor' => $valor,

    'status' => 'pending'

];

$chCompra = curl_init(
    rtrim(SUPABASE_URL, '/') . '/rest/v1/compras_doramas'
);

curl_setopt_array($chCompra, [

    CURLOPT_RETURNTRANSFER => true,

    CURLOPT_POST => true,

    CURLOPT_HTTPHEADER => [

        'apikey: ' . SUPABASE_SERVICE_KEY,

        'Authorization: Bearer ' . SUPABASE_SERVICE_KEY,

        'Content-Type: application/json',

        'Prefer: return=minimal'

    ],

    CURLOPT_POSTFIELDS => json_encode($compra),

    CURLOPT_TIMEOUT => 20

]);

$respostaCompra = curl_exec($chCompra);

$httpCompra = curl_getinfo($chCompra, CURLINFO_HTTP_CODE);

curl_close($chCompra);

if ($respostaCompra === false || $httpCompra < 200 || $httpCompra >= 300) {

    responder([

        'sucesso' => false,

        'mensagem' => 'PIX criado, mas não foi possível registrar a compra.',

        'erro' => $respostaCompra

    ], 500);

}


    responder([

        "sucesso" => false,

        "mensagem" =>

            "Mercado Pago não retornou o código PIX.",

        "resposta" =>

            $dados

    ], 500);



}





// =====================================================

// RESPOSTA PARA O INDEX

// =====================================================



responder([



    "sucesso" =>

        true,



    "order_id" =>

        $dados['id']

        ?? '',



    "external_reference" =>

        $externalReference,



    "status" =>

        $status,



    "payment_id" =>

        $paymentId,



    "qr_code" =>

        $qrCode,



    "qr_code_base64" =>

        $qrCodeBase64,



    "ticket_url" =>

        $ticketUrl



]);