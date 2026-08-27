// =============================================
// CONFIGURAÇÃO SUPABASE
// =============================================

const SUPABASE_URL = "https://kzruxizwpitsdkgwzbub.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_TnXAckKpgsihZYj2o4G8_Q__wNxvN2z";


// =============================================
// SUPABASE
// =============================================

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// =============================================
// TELEGRAM
// =============================================

const tg = window.Telegram?.WebApp;

if (tg) {

    tg.ready();

    tg.expand();

}


// =============================================
// ESTADO
// =============================================

let doramas = [];

let doramasFiltrados = [];

let categoriaAtual = "Todos";

let doramaAtual = null;


// =============================================
// ELEMENTOS
// =============================================

const catalogGrid =
    document.getElementById("catalogGrid");

const loading =
    document.getElementById("loading");

const empty =
    document.getElementById("empty");

const contador =
    document.getElementById("contador");

const searchInput =
    document.getElementById("searchInput");

const catalogo =
    document.getElementById("catalogo");

const detalhes =
    document.getElementById("detalhes");

const btnBack =
    document.getElementById("btnBack");


// =============================================
// INICIALIZAÇÃO
// =============================================

document.addEventListener(
    "DOMContentLoaded",
    iniciar
);


async function iniciar() {

    console.log("Iniciando Mini App...");

    console.log(
        "Telegram:",
        tg?.initDataUnsafe?.user
    );

    await carregarDoramas();

}


// =============================================
// CARREGAR DORAMAS
// =============================================

async function carregarDoramas() {

    loading.classList.remove("hidden");

    empty.classList.add("hidden");

    catalogGrid.innerHTML = "";

    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("doramas")

            .select("*")

            .eq("ativo", true)

            .order(
                "created_at",
                {
                    ascending: false
                }
            );


        if (error) {

            console.error(
                "Erro Supabase:",
                error
            );

            throw error;

        }


        doramas = data || [];

        doramasFiltrados = [...doramas];


        renderizarCatalogo();

    }

    catch (error) {

        console.error(error);

        catalogGrid.innerHTML = `
            <div style="
                grid-column:1/-1;
                padding:40px 10px;
                text-align:center;
                color:#ff5c8a;
            ">
                <h3>Erro ao carregar catálogo</h3>

                <p style="
                    margin-top:10px;
                    color:#999;
                ">
                    Verifique a configuração do Supabase.
                </p>
            </div>
        `;

    }

    finally {

        loading.classList.add("hidden");

    }

}


// =============================================
// RENDERIZAR CATÁLOGO
// =============================================

function renderizarCatalogo() {

    catalogGrid.innerHTML = "";


    contador.textContent =
        `${doramasFiltrados.length} ${
            doramasFiltrados.length === 1
                ? "título"
                : "títulos"
        }`;


    if (!doramasFiltrados.length) {

        empty.classList.remove("hidden");

        return;

    }


    empty.classList.add("hidden");


    doramasFiltrados.forEach(
        (dorama, index) => {

            const card =
                document.createElement("article");

            card.className =
                "dorama-card";

            card.style.animationDelay =
                `${index * 0.04}s`;


            card.onclick = () =>
                abrirDorama(dorama.id);


            card.innerHTML = `

                <img
                    class="card-image"
                    src="${escaparHTML(
                        dorama.capa_url ||
                        "https://via.placeholder.com/600x900?text=Dorama"
                    )}"
                    alt="${escaparHTML(
                        dorama.titulo
                    )}"
                    loading="lazy"
                >

                <div class="card-content">

                    <div class="card-title">
                        ${escaparHTML(
                            dorama.titulo
                        )}
                    </div>

                    <div class="card-meta">

                        <span class="card-category">
                            ${escaparHTML(
                                dorama.categoria ||
                                "Dorama"
                            )}
                        </span>

                        <span class="card-price">
                            ${formatarPreco(
                                dorama.preco
                            )}
                        </span>

                    </div>

                </div>

            `;


            catalogGrid.appendChild(card);

        }
    );

}


// =============================================
// BUSCA
// =============================================

searchInput.addEventListener(
    "input",
    aplicarFiltros
);


function aplicarFiltros() {

    const texto =
        searchInput.value
            .trim()
            .toLowerCase();


    doramasFiltrados =
        doramas.filter(
            dorama => {

                const correspondeTexto =

                    dorama.titulo
                        ?.toLowerCase()
                        .includes(texto)

                    ||

                    dorama.descricao
                        ?.toLowerCase()
                        .includes(texto);


                const correspondeCategoria =

                    categoriaAtual === "Todos"

                    ||

                    dorama.categoria ===
                        categoriaAtual;


                return (
                    correspondeTexto &&
                    correspondeCategoria
                );

            }
        );


    renderizarCatalogo();

}


// =============================================
// FILTRO CATEGORIA
// =============================================

function filtrarCategoria(
    categoria,
    botao
) {

    categoriaAtual = categoria;


    document
        .querySelectorAll(".category")
        .forEach(
            btn => btn.classList.remove("active")
        );


    botao.classList.add("active");


    aplicarFiltros();

}


// =============================================
// ABRIR DORAMA
// =============================================

async function abrirDorama(id) {

    doramaAtual =
        doramas.find(
            d => Number(d.id) === Number(id)
        );


    if (!doramaAtual) {

        return;

    }


    catalogo.classList.add("hidden");

    detalhes.classList.remove("hidden");

    btnBack.classList.remove("hidden");


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    preencherDetalhes();

    await carregarEpisodios(id);

}


// =============================================
// PREENCHER DETALHES
// =============================================

function preencherDetalhes() {

    document.getElementById(
        "detailsTitle"
    ).textContent =
        doramaAtual.titulo;


    document.getElementById(
        "detailsDescription"
    ).textContent =
        doramaAtual.descricao ||
        "Confira este dorama completo.";


    document.getElementById(
        "detailsCategory"
    ).textContent =
        doramaAtual.categoria ||
        "Dorama";


    document.getElementById(
        "detailsYear"
    ).textContent =
        doramaAtual.ano ||
        "";


    document.getElementById(
        "detailsPrice"
    ).textContent =
        formatarPreco(
            doramaAtual.preco
        );


    document.getElementById(
        "detailsCover"
    ).src =
        doramaAtual.capa_url ||
        "";


    const banner =
        document.getElementById(
            "detailsBanner"
        );


    banner.style.backgroundImage =
        `url("${doramaAtual.banner_url || doramaAtual.capa_url}")`;

}


// =============================================
// CARREGAR EPISÓDIOS
// =============================================

async function carregarEpisodios(
    doramaId
) {

    document.getElementById(
        "detailsEpisodes"
    ).textContent =
        "Dorama completo";


    document.getElementById(
        "episodeCount"
    ).textContent =
        "Completo";


    await verificarAcessoDorama();

}


// =============================================
// VOLTAR
// =============================================

function voltarCatalogo() {

    detalhes.classList.add("hidden");

    catalogo.classList.remove("hidden");

    btnBack.classList.add("hidden");

    doramaAtual = null;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// =============================================
// COMPRA
// =============================================
async function comprarDorama() {

    if (!doramaAtual) {
        return;
    }

    const usuario =
        obterUsuarioTelegram();

    if (!usuario) {

        mostrarMensagem(
            "Abra o DoramaFlix pelo Telegram para realizar a compra."
        );

        return;
    }


    const titulo =
        doramaAtual.titulo;

    const valor =
        Number(
            doramaAtual.preco || 0
        );


    if (valor <= 0) {

        mostrarMensagem(
            "Este dorama está sem preço cadastrado."
        );

        return;
    }


    const modal =
        document.getElementById(
            "pixModal"
        );

    const nome =
        document.getElementById(
            "pixDoramaNome"
        );

    const preco =
        document.getElementById(
            "pixValor"
        );

    const codigo =
        document.getElementById(
            "pixCodigo"
        );

    const qr =
        document.getElementById(
            "qrcode"
        );


    if (nome) {
        nome.textContent =
            titulo;
    }


    if (preco) {

        preco.textContent =
            formatarPreco(valor);

    }


    if (codigo) {
        codigo.value =
            "Gerando PIX...";
    }


    if (qr) {
        qr.innerHTML =
            "<p>Gerando QR Code...</p>";
    }


    if (modal) {
        modal.classList.remove(
            "hidden"
        );
    }


    try {

        /*
        ---------------------------------------------------
        URL DO SEU PHP
        ---------------------------------------------------
        */

        const resposta =
            await fetch(
                "https://radiogospelmusic.com.br/bot/dorama/criar_pix.php",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            dorama_id:
                                Number(
                                    doramaAtual.id
                                ),

                            titulo:
                                titulo,

                            valor:
                                valor,

                            telegram_id:
                                String(
                                    usuario.id
                                )

                        })

                }
            );


        const dados =
            await resposta.json();


        if (
            !resposta.ok ||
            !dados.sucesso
        ) {

            console.error(
                "Erro PIX:",
                dados
            );

            throw new Error(
                dados.mensagem ||
                "Não foi possível criar o PIX."
            );

        }


        /*
        ---------------------------------------------------
        PIX COPIA E COLA
        ---------------------------------------------------
        */

        if (codigo) {

            codigo.value =
                dados.qr_code || "";

        }


        /*
        ---------------------------------------------------
        QR CODE
        ---------------------------------------------------
        */

        if (qr) {

            qr.innerHTML = "";

            if (
                dados.qr_code_base64
            ) {

                const img =
                    document.createElement(
                        "img"
                    );

                img.src =
                    "data:image/png;base64," +
                    dados.qr_code_base64;

                img.alt =
                    "QR Code PIX";

                img.className =
                    "pix-imagem";

                qr.appendChild(
                    img
                );

            }
            else if (
                dados.qr_code
            ) {

                new QRCode(
                    qr,
                    {
                        text:
                            dados.qr_code,

                        width: 260,

                        height: 260
                    }
                );

            }
            else {

                qr.innerHTML =
                    "<p>QR Code não disponível.</p>";

            }

        }


        /*
        ---------------------------------------------------
        GUARDAR DADOS DA COMPRA
        ---------------------------------------------------
        */

        window.compraAtual = {

            order_id:
                dados.order_id,

            payment_id:
                dados.payment_id,

            external_reference:
                dados.external_reference,

            dorama_id:
                doramaAtual.id

        };


    }
    catch (erro) {

        console.error(
            erro
        );


        if (modal) {

            modal.classList.add(
                "hidden"
            );

        }


        mostrarMensagem(
            "Não foi possível gerar o PIX. Tente novamente."
        );

    }

}


// =============================================
// TELEGRAM USER
// =============================================

function obterUsuarioTelegram() {

    if (
        !tg ||
        !tg.initDataUnsafe ||
        !tg.initDataUnsafe.user
    ) {

        return null;

    }


    return tg.initDataUnsafe.user;

}


// =============================================
// FORMATA PREÇO
// =============================================

function formatarPreco(valor) {

    return Number(valor || 0)
        .toLocaleString(
            "pt-BR",
            {
                style: "currency",
                currency: "BRL"
            }
        );

}


// =============================================
// ESCAPAR HTML
// =============================================

function escaparHTML(valor) {

    if (valor === null ||
        valor === undefined) {

        return "";

    }


    return String(valor)
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


// =============================================
// MENSAGEM
// =============================================

function mostrarMensagem(
    mensagem
) {

    if (
        tg &&
        typeof tg.showAlert === "function"
    ) {

        tg.showAlert(mensagem);

        return;

    }


    alert(mensagem);

}



async function verificarAcesso() {

    const usuario =
        obterUsuarioTelegram();


    if (!usuario) {

        mostrarBloqueado();

        return false;

    }


    if (!doramaAtual) {

        mostrarBloqueado();

        return false;

    }


    const {
        data,
        error
    } = await supabaseClient

        .rpc(
            "tem_acesso_dorama",
            {

                p_telegram_id:
                    String(usuario.id),

                p_dorama_id:
                    Number(doramaAtual.id)

            }
        );


    if (error) {

        console.error(
            "Erro ao verificar acesso:",
            error
        );

        mostrarBloqueado();

        return false;

    }


    if (data === true) {

        mostrarLiberado();

        return true;

    }


    mostrarBloqueado();

    return false;

}

function mostrarBloqueado() {

    document
        .getElementById(
            "conteudoBloqueado"
        )
        .classList
        .remove("hidden");


    document
        .getElementById(
            "conteudoLiberado"
        )
        .classList
        .add("hidden");

}

function mostrarLiberado() {

    document
        .getElementById(
            "conteudoBloqueado"
        )
        .classList
        .add("hidden");


    document
        .getElementById(
            "conteudoLiberado"
        )
        .classList
        .remove("hidden");


    const video =
        window.doramaVideo;


    if (!video || !video.video_url) {

        document.getElementById(
            "videoContainer"
        ).innerHTML = `

            <div class="empty">

                🎬

                <h3>
                    Vídeo ainda não disponível
                </h3>

            </div>

        `;

        return;

    }


    document.getElementById(
        "videoTitulo"
    ).textContent =
        video.titulo ||
        "Dorama completo";


    const url =
        video.video_url;


    document.getElementById(
        "videoContainer"
    ).innerHTML = `

        <video
            controls
            playsinline
            preload="metadata"
            class="dorama-video"
        >

            <source
                src="${escaparHTML(url)}"
                type="video/mp4"
            >

            Seu navegador não suporta
            reprodução de vídeo.

        </video>

    `;

}



function gerarQRCode(codigo) {

    const elemento =
        document.getElementById(
            "qrcode"
        );


    elemento.innerHTML = "";


    new QRCode(
        elemento,
        {

            text: codigo,

            width: 220,

            height: 220,

            correctLevel:
                QRCode.CorrectLevel.M

        }
    );

}

async function copiarPix() {

    const campo =
        document.getElementById(
            "pixCodigo"
        );


    try {

        await navigator.clipboard.writeText(
            campo.value
        );


        mostrarMensagem(
            "✅ PIX copiado!"
        );

    }

    catch (error) {

        campo.select();

        document.execCommand(
            "copy"
        );


        mostrarMensagem(
            "✅ PIX copiado!"
        );

    }

}

function fecharPix() {

    document
        .getElementById(
            "pixModal"
        )
        .classList
        .add("hidden");

}

async function confirmarPagamento() {

    if (!doramaAtual) {
        return;
    }


    const usuario =
        obterUsuarioTelegram();


    if (!usuario) {

        mostrarMensagem(
            "Usuário Telegram não identificado."
        );

        return;

    }


    mostrarMensagem(
        "Verificando pagamento..."
    );


    const {

        data,

        error

    } = await supabaseClient
        .rpc(
            "tem_acesso_dorama",
            {

                p_telegram_id:
                    String(
                        usuario.id
                    ),

                p_dorama_id:
                    Number(
                        doramaAtual.id
                    )

            }
        );


    if (error) {

        console.error(
            error
        );

        mostrarMensagem(
            "Não foi possível verificar o pagamento."
        );

        return;
    }


    if (data === true) {

        fecharPix();

        mostrarVideoCompleto();

        mostrarMensagem(
            "Pagamento confirmado! Dorama liberado."
        );

        return;

    }


    mostrarMensagem(
        "O pagamento ainda não foi confirmado. Aguarde alguns instantes e tente novamente."
    );

}

function abrirPix() {

    document.getElementById(
        "pixDoramaNome"
    ).textContent =
        doramaAtual.titulo;


    document.getElementById(
        "pixValor"
    ).textContent =
        formatarPreco(
            doramaAtual.preco
        );


    document.getElementById(
        "pixStatus"
    ).textContent = "";


    document.getElementById(
        "pixModal"
    ).classList.remove(
        "hidden"
    );

}


function fecharPix() {

    document.getElementById(
        "pixModal"
    ).classList.add(
        "hidden"
    );

}
async function jaPaguei() {

    const usuario =
        obterUsuarioTelegram();


    if (!usuario) {

        mostrarMensagem(
            "Abra o catálogo pelo Telegram."
        );

        return;

    }


    if (
        !window.Telegram ||
        !Telegram.WebApp
    ) {

        mostrarMensagem(
            "Abra o sistema pelo Telegram."
        );

        return;

    }


    const status =
        document.getElementById(
            "pixStatus"
        );


    status.textContent =
        "⏳ Enviando solicitação...";


    try {

        const resposta =
            await fetch(
                "https://radiogospelmusic.com.br/bot/pagamento.php",
                {

                    method: "POST",

                    headers: {

                        "Content-Type":
                            "application/json"

                    },

                    body:
                        JSON.stringify({

                            initData:
                                Telegram.WebApp
                                    .initData,

                            dorama_id:
                                doramaAtual.id

                        })

                }
            );


        const resultado =
            await resposta.json();


        if (!resultado.ok) {

            throw new Error(
                resultado.mensagem ||
                "Erro."
            );

        }


        status.textContent =
            "✅ Solicitação enviada! " +
            "Aguarde a confirmação.";


        mostrarMensagem(
            "✅ Solicitação enviada!\n\n" +
            "Assim que o pagamento for conferido, " +
            "seu dorama será liberado."
        );


    }

    catch (erro) {

        console.error(erro);


        status.textContent =
            "❌ Não foi possível enviar.";


        mostrarMensagem(
            "Não foi possível registrar " +
            "a solicitação."
        );

    }

}

async function verificarAcessoDorama() {

    const usuario =
        obterUsuarioTelegram();


    if (!usuario || !doramaAtual) {

        mostrarBloqueado();

        return false;

    }


    const {
        data,
        error
    } =
        await supabaseClient.rpc(
            "tem_acesso_dorama",
            {

                p_telegram_id:
                    String(usuario.id),

                p_dorama_id:
                    Number(doramaAtual.id)

            }
        );


    if (error) {

        console.error(error);

        mostrarBloqueado();

        return false;

    }


    if (data === true) {

        mostrarVideoCompleto();

        return true;

    }


    mostrarBloqueado();

    return false;

}

function mostrarVideoCompleto() {

    const lista =
        document.getElementById(
            "episodesList"
        );


    lista.innerHTML = `

        <div class="video-liberado">

            <div class="acesso-ok">

                🔓 DORAMA LIBERADO

            </div>


            <h3>

                ▶ ${escaparHTML(
                    doramaAtual.titulo
                )}

            </h3>


            <video
                id="doramaVideo"
                controls
                playsinline
                preload="metadata"
                class="dorama-video"
            ></video>

        </div>

    `;


    carregarVideoCompleto();

}

async function carregarVideoCompleto() {

    const {
        data,
        error
    } =
        await supabaseClient

            .from("episodios")

            .select(
                "video_url,titulo"
            )

            .eq(
                "dorama_id",
                doramaAtual.id
            )

            .eq(
                "ativo",
                true
            )

            .order(
                "numero",
                {
                    ascending: true
                }
            )

            .limit(1);


    if (
        error ||
        !data ||
        !data.length
    ) {

        mostrarMensagem(
            "Vídeo ainda não cadastrado."
        );

        return;

    }


    const video =
        document.getElementById(
            "doramaVideo"
        );


    video.src =
        data[0].video_url;

}

function mostrarBloqueado() {

    const lista =
        document.getElementById(
            "episodesList"
        );


    lista.innerHTML = `

        <div class="conteudo-bloqueado">

            <div class="bloqueio-icon">
                🔒
            </div>


            <h3>
                Dorama bloqueado
            </h3>


            <p>
                Faça o pagamento para
                assistir ao dorama completo.
            </p>


            <button
                class="buy-button"
                onclick="comprarDorama()"
            >
                💰 Comprar acesso
            </button>

        </div>

    `;

}