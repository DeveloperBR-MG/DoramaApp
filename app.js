// ============================================================
// DORAMAFLIX - APP.JS
// ============================================================

// ============================================================
// CONFIGURAÇÃO SUPABASE
// ============================================================

const SUPABASE_URL =
    "https://kzruxizwpitsdkgwzbub.supabase.co";

const SUPABASE_ANON_KEY =
    "sb_publishable_TnXAckKpgsihZYj2o4G8_Q__wNxvN2z";


// ============================================================
// CLIENTE SUPABASE
// ============================================================

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
    );


// ============================================================
// TELEGRAM
// ============================================================

const tg =
    window.Telegram?.WebApp || null;


if (tg) {

    tg.ready();

    tg.expand();

}


// ============================================================
// ESTADO DA APLICAÇÃO
// ============================================================

let doramas = [];

let doramasFiltrados = [];

let categoriaAtual = "Todos";

let doramaAtual = null;

let compraAtual = null;

let monitoramentoPagamento = null;


// ============================================================
// ELEMENTOS
// ============================================================

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


// ============================================================
// INICIALIZAÇÃO
// ============================================================

document.addEventListener(
    "DOMContentLoaded",
    iniciar
);


async function iniciar() {

    console.log(
        "DoramaFlix iniciando..."
    );


    console.log(
        "Telegram:",
        tg?.initDataUnsafe?.user || null
    );


    await carregarDoramas();


    if (searchInput) {

        searchInput.addEventListener(
            "input",
            aplicarFiltros
        );

    }

}


// ============================================================
// CARREGAR DORAMAS DO SUPABASE
// ============================================================

async function carregarDoramas() {

    if (!catalogGrid) {
        return;
    }


    if (loading) {
        loading.classList.remove("hidden");
    }


    if (empty) {
        empty.classList.add("hidden");
    }


    catalogGrid.innerHTML = "";


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("doramas")

            .select("*")

            .eq(
                "ativo",
                true
            )

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


        doramas =
            data || [];


        doramasFiltrados =
            [...doramas];


        renderizarCatalogo();

    }

    catch (erro) {

        console.error(
            "Erro ao carregar catálogo:",
            erro
        );


        catalogGrid.innerHTML = `

            <div
                style="
                    grid-column:1/-1;
                    padding:40px 20px;
                    text-align:center;
                "
            >

                <h3>
                    Erro ao carregar catálogo
                </h3>

                <p>
                    Verifique a conexão com o Supabase.
                </p>

            </div>

        `;

    }

    finally {

        if (loading) {

            loading.classList.add(
                "hidden"
            );

        }

    }

}


// ============================================================
// RENDERIZAR CATÁLOGO
// ============================================================

function renderizarCatalogo() {

    if (!catalogGrid) {
        return;
    }


    catalogGrid.innerHTML = "";


    if (contador) {

        contador.textContent =

            `${doramasFiltrados.length} ${
                doramasFiltrados.length === 1
                    ? "título"
                    : "títulos"
            }`;

    }


    if (
        doramasFiltrados.length === 0
    ) {

        if (empty) {

            empty.classList.remove(
                "hidden"
            );

        }

        return;

    }


    if (empty) {

        empty.classList.add(
            "hidden"
        );

    }


    doramasFiltrados.forEach(
        (dorama, index) => {

            const card =
                document.createElement(
                    "article"
                );


            card.className =
                "dorama-card";


            card.style.animationDelay =
                `${index * 0.04}s`;


            card.onclick = function () {

                abrirDorama(
                    dorama.id
                );

            };


            const capa =
                escaparHTML(
                    dorama.capa_url ||
                    "https://via.placeholder.com/600x900?text=Dorama"
                );


            const titulo =
                escaparHTML(
                    dorama.titulo ||
                    "Dorama"
                );


            const categoria =
                escaparHTML(
                    dorama.categoria ||
                    "Dorama"
                );


            card.innerHTML = `

                <img
                    class="card-image"
                    src="${capa}"
                    alt="${titulo}"
                    loading="lazy"
                >

                <div class="card-content">

                    <div class="card-title">
                        ${titulo}
                    </div>

                    <div class="card-meta">

                        <span class="card-category">
                            ${categoria}
                        </span>

                        <span class="card-price">
                            ${formatarPreco(
                                dorama.preco
                            )}
                        </span>

                    </div>

                </div>

            `;


            catalogGrid.appendChild(
                card
            );

        }
    );

}


// ============================================================
// BUSCA
// ============================================================

function aplicarFiltros() {

    const texto =
        searchInput
            ? searchInput.value
                .trim()
                .toLowerCase()
            : "";


    doramasFiltrados =
        doramas.filter(
            function (dorama) {

                const titulo =
                    String(
                        dorama.titulo || ""
                    )
                    .toLowerCase();


                const descricao =
                    String(
                        dorama.descricao || ""
                    )
                    .toLowerCase();


                const categoria =
                    String(
                        dorama.categoria || ""
                    );


                const correspondeTexto =

                    titulo.includes(
                        texto
                    )

                    ||

                    descricao.includes(
                        texto
                    );


                const correspondeCategoria =

                    categoriaAtual ===
                    "Todos"

                    ||

                    categoria ===
                    categoriaAtual;


                return (
                    correspondeTexto &&
                    correspondeCategoria
                );

            }
        );


    renderizarCatalogo();

}


// ============================================================
// FILTRO POR CATEGORIA
// ============================================================

function filtrarCategoria(
    categoria,
    botao
) {

    categoriaAtual =
        categoria;


    document
        .querySelectorAll(
            ".category"
        )
        .forEach(
            function (btn) {

                btn.classList.remove(
                    "active"
                );

            }
        );


    if (botao) {

        botao.classList.add(
            "active"
        );

    }


    aplicarFiltros();

}


// ============================================================
// ABRIR DORAMA
// ============================================================

async function abrirDorama(
    id
) {

    doramaAtual =
        doramas.find(
            function (dorama) {

                return Number(
                    dorama.id
                ) === Number(id);

            }
        );


    if (!doramaAtual) {

        mostrarMensagem(
            "Dorama não encontrado."
        );

        return;

    }


    if (catalogo) {

        catalogo.classList.add(
            "hidden"
        );

    }


    if (detalhes) {

        detalhes.classList.remove(
            "hidden"
        );

    }


    if (btnBack) {

        btnBack.classList.remove(
            "hidden"
        );

    }


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    preencherDetalhes();


    await verificarAcessoDorama();

}


// ============================================================
// PREENCHER DETALHES
// ============================================================

function preencherDetalhes() {

    if (!doramaAtual) {
        return;
    }


    const title =
        document.getElementById(
            "detailsTitle"
        );


    const description =
        document.getElementById(
            "detailsDescription"
        );


    const category =
        document.getElementById(
            "detailsCategory"
        );


    const year =
        document.getElementById(
            "detailsYear"
        );


    const price =
        document.getElementById(
            "detailsPrice"
        );


    const cover =
        document.getElementById(
            "detailsCover"
        );


    const banner =
        document.getElementById(
            "detailsBanner"
        );


    if (title) {

        title.textContent =
            doramaAtual.titulo ||
            "Dorama";

    }


    if (description) {

        description.textContent =
            doramaAtual.descricao ||
            "Confira este dorama completo.";

    }


    if (category) {

        category.textContent =
            doramaAtual.categoria ||
            "Dorama";

    }


    if (year) {

        year.textContent =
            doramaAtual.ano ||
            "";

    }


    if (price) {

        price.textContent =
            formatarPreco(
                doramaAtual.preco
            );

    }


    if (cover) {

        cover.src =
            doramaAtual.capa_url ||
            "";

    }


    if (banner) {

        const imagem =
            doramaAtual.banner_url ||
            doramaAtual.capa_url ||
            "";


        banner.style.backgroundImage =
            `url("${imagem}")`;

    }


    const episodeCount =
        document.getElementById(
            "episodeCount"
        );


    const detailsEpisodes =
        document.getElementById(
            "detailsEpisodes"
        );


    if (episodeCount) {

        episodeCount.textContent =
            "Completo";

    }


    if (detailsEpisodes) {

        detailsEpisodes.textContent =
            "Dorama completo";

    }

}


// ============================================================
// VOLTAR PARA O CATÁLOGO
// ============================================================

function voltarCatalogo() {

    if (detalhes) {

        detalhes.classList.add(
            "hidden"
        );

    }


    if (catalogo) {

        catalogo.classList.remove(
            "hidden"
        );

    }


    if (btnBack) {

        btnBack.classList.add(
            "hidden"
        );

    }


    pararMonitoramentoPagamento();

    doramaAtual = null;

    compraAtual = null;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


// ============================================================
// COMPRAR DORAMA
// ============================================================

async function comprarDorama() {

    if (!doramaAtual) {

        mostrarMensagem(
            "Selecione um dorama primeiro."
        );

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
            doramaAtual.titulo;

    }


    if (preco) {

        preco.textContent =
            formatarPreco(
                valor
            );

    }


    if (codigo) {

        codigo.value =
            "Gerando PIX...";

    }


    if (qr) {

        qr.innerHTML = `

            <p>
                Gerando QR Code...
            </p>

        `;

    }


    if (modal) {

        modal.classList.remove(
            "hidden"
        );

    }


    try {

        console.log(
            "Criando PIX..."
        );


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
                                doramaAtual.titulo,

                            valor:
                                valor,

                            telegram_id:
                                String(
                                    usuario.id
                                ),

                            telegram_chat_id:
                                String(
                                    usuario.id
                                )

                        })

                }
            );


        const texto =
            await resposta.text();


        console.log(
            "Resposta criar_pix.php:",
            texto
        );


        let dados;


        try {

            dados =
                JSON.parse(
                    texto
                );

        }

        catch (erroJSON) {

            console.error(
                "Resposta não é JSON:",
                texto
            );


            throw new Error(
                "O servidor retornou HTML em vez de JSON."
            );

        }


        if (
            !resposta.ok ||
            !dados.sucesso
        ) {

            throw new Error(
                dados.mensagem ||
                dados.erro ||
                "Não foi possível criar o PIX."
            );

        }


        // ====================================================
        // SALVAR DADOS DA COMPRA
        // ====================================================

        compraAtual = {

            order_id:
                dados.order_id || null,

            payment_id:
                dados.payment_id || null,

            external_reference:
                dados.external_reference ||
                null,

            dorama_id:
                Number(
                    doramaAtual.id
                )

        };


        // ====================================================
        // PIX COPIA E COLA
        // ====================================================

        if (codigo) {

            codigo.value =
                dados.qr_code ||
                "";

        }


        // ====================================================
        // QR CODE
        // ====================================================

        if (qr) {

            qr.innerHTML = "";


            if (
                dados.qr_code_base64
            ) {

                const imagem =
                    document.createElement(
                        "img"
                    );


                imagem.src =
                    "data:image/png;base64," +
                    dados.qr_code_base64;


                imagem.alt =
                    "QR Code PIX";


                imagem.className =
                    "pix-imagem";


                qr.appendChild(
                    imagem
                );

            }

            else if (
                dados.qr_code
            ) {

                if (
                    typeof QRCode !==
                    "undefined"
                ) {

                    new QRCode(
                        qr,
                        {

                            text:
                                dados.qr_code,

                            width:
                                260,

                            height:
                                260

                        }
                    );

                }

                else {

                    qr.innerHTML = `

                        <p>
                            QR Code não carregado.
                        </p>

                    `;

                }

            }

            else {

                qr.innerHTML = `

                    <p>
                        QR Code não disponível.
                    </p>

                `;

            }

        }


        console.log(
            "PIX criado:",
            compraAtual
        );

        iniciarMonitoramentoPagamento();

    }

    catch (erro) {

        console.error(
            "Erro ao criar PIX:",
            erro
        );


        if (modal) {

            modal.classList.add(
                "hidden"
            );

        }


        mostrarMensagem(
            "Erro ao gerar o PIX:\n\n" +
            erro.message
        );

    }

}


// ============================================================
// CONFIRMAR PAGAMENTO
// ============================================================

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
        "⏳ Verificando pagamento..."
    );


    try {

        const {
            data,
            error
        } =
            await supabaseClient

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
                "Erro RPC:",
                error
            );


            throw error;

        }


        if (data === true) {

            await finalizarPagamentoConfirmado();


            return;

        }


        mostrarMensagem(

            "⏳ O pagamento ainda não foi confirmado.\n\n" +

            "Aguarde alguns instantes e clique novamente em " +

            "\"Já fiz o pagamento\"."

        );

    }

    catch (erro) {

        console.error(
            erro
        );


        mostrarMensagem(
            "Não foi possível verificar o pagamento."
        );

    }

}


function iniciarMonitoramentoPagamento() {

    if (monitoramentoPagamento || !doramaAtual) {
        return;
    }


    monitoramentoPagamento = setInterval(
        async function () {

            if (await verificarAcessoDorama()) {

                await finalizarPagamentoConfirmado();

            }

        },
        5000
    );

}


function pararMonitoramentoPagamento() {

    if (monitoramentoPagamento) {

        clearInterval(monitoramentoPagamento);

        monitoramentoPagamento = null;

    }

}


async function finalizarPagamentoConfirmado() {

    pararMonitoramentoPagamento();

    fecharPix();

    await mostrarVideoCompleto();

    mostrarMensagem(
        "✅ Pagamento confirmado!\n\n" +
        "O dorama foi liberado."
    );

}


// ============================================================
// VERIFICAR ACESSO AO DORAMA
// ============================================================

async function verificarAcessoDorama() {

    const usuario =
        obterUsuarioTelegram();


    if (
        !usuario ||
        !doramaAtual
    ) {

        mostrarBloqueado();

        return false;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient

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
                "Erro ao verificar acesso:",
                error
            );


            mostrarBloqueado();


            return false;

        }


        if (data === true) {

            await mostrarVideoCompleto();


            return true;

        }


        mostrarBloqueado();


        return false;

    }

    catch (erro) {

        console.error(
            erro
        );


        mostrarBloqueado();


        return false;

    }

}


// ============================================================
// MOSTRAR BLOQUEADO
// ============================================================

function mostrarBloqueado() {

    const bloqueado =
        document.getElementById(
            "conteudoBloqueado"
        );


    const liberado =
        document.getElementById(
            "conteudoLiberado"
        );


    if (bloqueado) {

        bloqueado.classList.remove(
            "hidden"
        );

    }


    if (liberado) {

        liberado.classList.add(
            "hidden"
        );

    }

}


// ============================================================
// MOSTRAR DORAMA COMPLETO
// ============================================================

async function mostrarVideoCompleto() {

    const bloqueado =
        document.getElementById(
            "conteudoBloqueado"
        );


    const liberado =
        document.getElementById(
            "conteudoLiberado"
        );


    const videoContainer =
        document.getElementById(
            "videoContainer"
        );


    if (bloqueado) {

        bloqueado.classList.add(
            "hidden"
        );

    }


    if (liberado) {

        liberado.classList.remove(
            "hidden"
        );

    }


    if (!videoContainer) {

        return;

    }


    videoContainer.innerHTML = `

        <div
            style="
                padding:30px;
                text-align:center;
            "
        >

            ⏳ Carregando dorama...

        </div>

    `;


    try {

        const {
            data,
            error
        } =
            await supabaseClient

                .from("episodios")

                .select(
                    "id,numero,titulo,video_url"
                )

                .eq(
                    "dorama_id",
                    Number(
                        doramaAtual.id
                    )
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


        if (error) {

            throw error;

        }


        if (
            !data ||
            data.length === 0
        ) {

            videoContainer.innerHTML = `

                <div class="empty">

                    <div>
                        🎬
                    </div>

                    <h3>
                        Vídeo ainda não disponível
                    </h3>

                    <p>
                        Este dorama ainda não possui
                        vídeo cadastrado.
                    </p>

                </div>

            `;

            return;

        }


        const episodio =
            data[0];


        if (!episodio.video_url) {

            videoContainer.innerHTML = `

                <div class="empty">

                    <div>
                        🎬
                    </div>

                    <h3>
                        Vídeo ainda não disponível
                    </h3>

                </div>

            `;

            return;

        }


        const titulo =
            escaparHTML(
                episodio.titulo ||
                doramaAtual.titulo ||
                "Dorama completo"
            );


        const url =
            escaparHTML(
                episodio.video_url
            );


        videoContainer.innerHTML = `

            <div
                class="acesso-liberado"
            >
                🔓 DORAMA LIBERADO
            </div>


            <h3>
                ${titulo}
            </h3>


            <video
                controls
                playsinline
                preload="metadata"
                class="dorama-video"
            >

                <source
                    src="${url}"
                    type="video/mp4"
                >

                Seu navegador não suporta
                reprodução de vídeo.

            </video>

        `;

    }

    catch (erro) {

        console.error(
            "Erro ao carregar vídeo:",
            erro
        );


        videoContainer.innerHTML = `

            <div class="empty">

                <div>
                    ❌
                </div>

                <h3>
                    Erro ao carregar o vídeo
                </h3>

            </div>

        `;

    }

}


// ============================================================
// FECHAR PIX
// ============================================================

function fecharPix() {

    const modal =
        document.getElementById(
            "pixModal"
        );


    if (modal) {

        modal.classList.add(
            "hidden"
        );

    }


    pararMonitoramentoPagamento();

}


// ============================================================
// COPIAR PIX
// ============================================================

async function copiarPix() {

    const campo =
        document.getElementById(
            "pixCodigo"
        );


    if (!campo) {

        return;

    }


    const codigo =
        campo.value.trim();


    if (!codigo) {

        mostrarMensagem(
            "Código PIX ainda não disponível."
        );

        return;

    }


    try {

        await navigator.clipboard.writeText(
            codigo
        );


        mostrarMensagem(
            "✅ PIX copiado!"
        );

    }

    catch (erro) {

        campo.focus();

        campo.select();


        try {

            document.execCommand(
                "copy"
            );

            mostrarMensagem(
                "✅ PIX copiado!"
            );

        }

        catch (erro2) {

            mostrarMensagem(
                "Não foi possível copiar automaticamente."
            );

        }

    }

}


// ============================================================
// OBTER USUÁRIO TELEGRAM
// ============================================================

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


// ============================================================
// FORMATAR PREÇO
// ============================================================

function formatarPreco(
    valor
) {

    return Number(
        valor || 0
    ).toLocaleString(
        "pt-BR",
        {

            style:
                "currency",

            currency:
                "BRL"

        }
    );

}


// ============================================================
// ESCAPAR HTML
// ============================================================

function escaparHTML(
    valor
) {

    if (
        valor === null ||
        valor === undefined
    ) {

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


// ============================================================
// MENSAGEM
// ============================================================

function mostrarMensagem(
    mensagem
) {

    if (
        tg &&
        typeof tg.showAlert ===
        "function"
    ) {

        tg.showAlert(
            mensagem
        );

        return;

    }


    alert(
        mensagem
    );

}