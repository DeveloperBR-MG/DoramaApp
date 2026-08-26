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

    const lista =
        document.getElementById(
            "episodesList"
        );


    lista.innerHTML = `
        <div class="loading">
            Carregando episódios...
        </div>
    `;


    try {

        const {
            data,
            error
        } = await supabaseClient

            .from("episodios")

            .select("*")

            .eq(
                "dorama_id",
                doramaId
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
            );


        if (error) {

            throw error;

        }


        document.getElementById(
            "detailsEpisodes"
        ).textContent =
            `${data.length} episódios`;


        document.getElementById(
            "episodeCount"
        ).textContent =
            data.length;


        lista.innerHTML = "";


        if (!data.length) {

            lista.innerHTML = `
                <div class="empty">
                    Nenhum episódio cadastrado.
                </div>
            `;

            return;

        }


        data.forEach(
            episodio => {

                const item =
                    document.createElement(
                        "div"
                    );

                item.className =
                    "episode";


                item.innerHTML = `

                    <div class="episode-number">
                        ${episodio.numero}
                    </div>

                    <div class="episode-info">

                        <strong>
                            ${escaparHTML(
                                episodio.titulo ||
                                `Episódio ${episodio.numero}`
                            )}
                        </strong>

                        <span>
                            🔒 Disponível após a compra
                        </span>

                    </div>

                    <div class="episode-lock">
                        🔒
                    </div>

                `;


                lista.appendChild(item);

            }
        );

    }

    catch (error) {

        console.error(error);

        lista.innerHTML = `
            <div class="empty">
                Erro ao carregar episódios.
            </div>
        `;

    }

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

function comprarDorama() {

    if (!doramaAtual) {

        return;

    }


    const titulo =
        doramaAtual.titulo;


    const preco =
        formatarPreco(
            doramaAtual.preco
        );


    mostrarMensagem(
        `Compra de "${titulo}" por ${preco} será integrada na próxima etapa.`
    );

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