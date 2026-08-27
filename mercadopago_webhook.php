<?php



require_once __DIR__ . '/config.php';





http_response_code(200);



header(

    'Content-Type: application/json; charset=utf-8'

);





/*

|--------------------------------------------------------------------------

| RECEBER NOTIFICAÇÃO

|--------------------------------------------------------------------------

*/



$body =

    file_get_contents(

        'php://input'

    );





$data =

    json_decode(

        $body,

        true

    );





/*

|--------------------------------------------------------------------------

| MERCADO PAGO ENVIA:

|

| type = order

|

| data.id = ID DA ORDER

|--------------------------------------------------------------------------

*/



$type =

    $_GET['type']

    ?? ($data['type'] ?? null);





$orderId =

    $_GET['data.id']

    ?? ($data['data']['id'] ?? null);





if (

    $type !== 'order' ||

    !$orderId

) {



    echo json_encode([

        'ok' => true,

        'ignorado' => true

    ]);



    exit;

}





/*

|--------------------------------------------------------------------------

| BUSCAR ORDER NO MERCADO PAGO

|--------------------------------------------------------------------------

*/



$url =

    'https://api.mercadopago.com/v1/orders/' .

    urlencode($orderId);





$ch =

    curl_init($url);





curl_setopt_array(

    $ch,

    [



        CURLOPT_RETURNTRANSFER =>

            true,



        CURLOPT_HTTPHEADER => [



            'Authorization: Bearer ' .

            MERCADO_PAGO_ACCESS_TOKEN,



            'Content-Type: application/json'



        ]



    ]

);





$response =

    curl_exec($ch);





$httpCode =

    curl_getinfo(

        $ch,

        CURLINFO_HTTP_CODE

    );





curl_close($ch);





if (

    $response === false ||

    $httpCode < 200 ||

    $httpCode >= 300

) {



    echo json_encode([

        'ok' => false

    ]);



    exit;

}





$order =

    json_decode(

        $response,

        true

    );





/*

|--------------------------------------------------------------------------

| STATUS DA ORDER

|--------------------------------------------------------------------------

*/



$orderStatus =

    $order['status']

    ?? null;





$externalReference =

    $order['external_reference']

    ?? null;





/*

|--------------------------------------------------------------------------

| LOCALIZAR PAGAMENTO

|--------------------------------------------------------------------------

*/



$paymentId = null;



$paymentStatus = null;





if (

    isset(

        $order['transactions']

        ['payments']

    )

) {



    $payments =

        $order['transactions']

        ['payments'];





    if (

        isset(

            $payments[0]

        )

    ) {



        $payment =

            $payments[0];





        $paymentId =

            $payment['id']

            ?? null;





        $paymentStatus =

            $payment['status']

            ?? null;



    }



}





/*

|--------------------------------------------------------------------------

| DEFINIR STATUS DO NOSSO SISTEMA

|--------------------------------------------------------------------------

*/



$novoStatus =

    'pending';





if (

    $paymentStatus ===

    'approved'

) {



    $novoStatus =

        'approved';



}

elseif (

    $paymentStatus ===

    'rejected'

) {



    $novoStatus =

        'rejected';



}

elseif (

    $paymentStatus ===

    'cancelled'

) {



    $novoStatus =

        'cancelled';



}

elseif (

    $paymentStatus ===

    'refunded'

) {



    $novoStatus =

        'refunded';



}





/*

|--------------------------------------------------------------------------

| ATUALIZAR SUPABASE

|--------------------------------------------------------------------------

*/



$supabaseUrl =

    rtrim(

        SUPABASE_URL,

        '/'

    );





$filter =

    '?order_id=eq.' .

    urlencode(

        $orderId

    );





$update = [



    'status' =>

        $novoStatus,



    'payment_id' =>

        $paymentId



];





if (

    $novoStatus ===

    'approved'

) {



    $update['paid_at'] =

        date(

            'c'

        );



}





$chSupabase =

    curl_init(

        $supabaseUrl .

        '/rest/v1/compras_doramas' .

        $filter

    );





curl_setopt_array(

    $chSupabase,

    [



        CURLOPT_RETURNTRANSFER =>

            true,



        CURLOPT_CUSTOMREQUEST =>

            'PATCH',



        CURLOPT_HTTPHEADER => [



            'apikey: ' .

            SUPABASE_SERVICE_KEY,



            'Authorization: Bearer ' .

            SUPABASE_SERVICE_KEY,



            'Content-Type: application/json',



            'Prefer: return=minimal'



        ],



        CURLOPT_POSTFIELDS =>

            json_encode($update)



    ]

);





$supabaseResponse =

    curl_exec(

        $chSupabase

    );





$supabaseHttp =

    curl_getinfo(

        $chSupabase,

        CURLINFO_HTTP_CODE

    );





curl_close(

    $chSupabase

);





function consultarSupabase($url)
{

    $ch = curl_init($url);

    curl_setopt_array($ch, [

        CURLOPT_RETURNTRANSFER => true,

        CURLOPT_HTTPHEADER => [

            'apikey: ' . SUPABASE_SERVICE_KEY,

            'Authorization: Bearer ' . SUPABASE_SERVICE_KEY

        ],

        CURLOPT_TIMEOUT => 20

    ]);

    $resposta = curl_exec($ch);

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    if ($resposta === false || $httpCode < 200 || $httpCode >= 300) {
        error_log('Supabase consulta falhou: ' . $resposta);
        return [];
    }

    $dados = json_decode($resposta, true);

    return is_array($dados) ? $dados : [];

}


function enviarVideoTelegram($chatId, $videoUrl, $titulo)
{

    $ch = curl_init(
        'https://api.telegram.org/bot' . BOT_TOKEN . '/sendVideo'
    );

    curl_setopt_array($ch, [

        CURLOPT_POST => true,

        CURLOPT_POSTFIELDS => http_build_query([

            'chat_id' => $chatId,

            'video' => $videoUrl,

            'caption' => "Pagamento confirmado!\n\n" . $titulo,

            'supports_streaming' => 'true'

        ]),

        CURLOPT_RETURNTRANSFER => true,

        CURLOPT_TIMEOUT => 60

    ]);

    $resposta = curl_exec($ch);

    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

    curl_close($ch);

    if ($resposta === false || $httpCode < 200 || $httpCode >= 300) {
        error_log('Telegram sendVideo falhou: ' . $resposta);
    }

}


echo json_encode([



    'ok' => true,



    'order_id' =>

        $orderId,



    'payment_status' =>

        $paymentStatus,



    'status' =>

        $novoStatus,



    'supabase_http' =>

        $supabaseHttp



]);