// ==MiruExtension==
// @name         VerComicPorno
// @version      v0.0.2
// @author       Freitez93
// @lang         es
// @license      MIT
// @package      vercomicsporno
// @type         manga
// @icon         https://vercomicsporno.com/wp-content/uploads/Iconx64.png
// @webSite      https://vercomicsporno.com
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
	async req(url) {
		const baseUrl = url.replace(await this.getSetting("comic"), "");
		return this.request(baseUrl, {
			headers: {
				"Miru-Url": await this.getSetting("comic"),
			},
		});
	}

	async load() {
		this.registerSetting({
			title: "Page Base Url",
			key: "comic",
			type: "input",
			desc: "this is the url where the comics are fetched from",
			defaultValue: "https://vercomicsporno.com",
		});
	}

	async latest(page) {
		let html = await this.req(`/comics-porno/page/${page}`);

		let items = await this.querySelectorAll(html, ".blog-list-items a.popimg");

		let respItems = await Promise.all(
			items.map(async (item) => ({
				url: await this.getAttributeText(item.content, "a", "href"),
				cover: await this.getAttributeText(
					item.content,
					"img",
					"data-src"
				),
				title: await this.getAttributeText(item.content, "img", "alt"),
			}))
		);

		return respItems;
	}

	async createFilter(filter) {
		if (filter) console.log(filter);

		const mainbar = {
			title: "Categoria basica",
			max: 1,
			min: 0,
			default: "",
			options: {
				"vercomicsporno":"Exlucivos",
				"milftoon":"Milftoon",
				"comics-3d":"Comics 3D",
				"crazydad3d":"CrazyDad3D",
				"art-of-jaguar":"Art of Jaguar",
			},
		}

		const genres = {
			title: "Etiquetas populares!",
			max: 1,
			min: 0,
			default: "",
			options: {
				"anime":"Anime",
				"anales":"Anal",
				"aprobado-por-c1b3r3y3":"Aprobado Por C1b3rey3",
				"culonas":"Culonas",
				"culonas-tetonas":"Culonas y Tetonas",
				"furry-3": "Furry",
				"futanari-2":"Futanari",
				"incesto":"Incesto",
				"lesbianas":"Lesbianas",
				"madre-hijo":"Madre Hijo",
				"mamadas":"Mamadas",
				"manga-hentai-3":"Manga Hentai",
				"masturbaciones":"Masturbaciones",
				"milfs-xxx":"Milfs",
				"orgias":"Orgias",
				"parodias-porno-xxx":"Parodias Porno",
				"tetonas":"Tetonas",
				"trios":"Trios",
				"yuri-xxx":"Yuri"
			}
		}

		return {
			mainbar,
			genres
		}
	}

	async search(kw, page, filter) {
		let textSearch = (!kw) ? "" : `?s=${kw.replaceAll(" ", "+")}`;
		let searchUrl = `/comics-porno/page/${page}${textSearch}`;

		if (filter) {
			const isSearch = kw ? "" : `/page/${page}`

			if (filter.mainbar[0]){ //----- Detecto Categorias
				searchUrl = `/categorias/${filter.mainbar[0]}${isSearch}${textSearch}`
			} else if (filter.genres[0]) { //----- Detecto Etiquetas
				searchUrl = `/etiquetas/${filter.genres[0]}${isSearch}${textSearch}`
			}
		}

		console.log(`[Debug] searchUrl: ${searchUrl}`)
		let searchResponse = await this.req(searchUrl);
		let items = await this.querySelectorAll(searchResponse, ".blog-list-items a.popimg");

		let respItems = await Promise.all(
			items.map(async (item) => ({
				url: await this.getAttributeText(item.content, "a", "href"),
				cover: await this.getAttributeText(item.content, "img", "data-src"),
				title: await this.getAttributeText(item.content, "img", "alt"),
			}))
		);

		return respItems.filter(element =>
			element.title.match("English") === null
		);
	}

	async detail(url) {
		const detailResponse = await this.req(url); //----- Cargamos Informacion de la Pagina

		//----- Sacamos la Informacion del Comic
		const autor = await this.querySelector(detailResponse, "span.autor > b").text;
		const date = await this.querySelector(detailResponse, "span.date").text;
		const tagsLinks = await this.querySelectorAll(detailResponse, "div.links > ul > li");
		let artist = false, categories = "Categorias:", labels = "Etiquetas:";
		for (const element of tagsLinks){
			const href = await this.getAttributeText(element.content, "a", "href")
			const name = await this.querySelector(element.content, "a").text
			if (href.match('/etiquetas/') !== null){
				if (name.match('Artist:') !== null){
					artist = name
				} else {
					labels = `${labels}, ${name}`
				}
			} else {
				categories = `${categories}, ${name}`
			}
		}

		//----- Informacion del Comic
		const title = (await this.querySelector(detailResponse, "h1.titl").text).trim();
		const cover = await this.getAttributeText(detailResponse, ".wp-content img", "data-src");
		const desc = `» Publicado por ${autor}el ${date}\n${artist||"Artist: Desconocido"}\n${categories}\n${labels}`;

		return {
			title,
			cover,
			desc,
			episodes: [
				{
					title: "Chapters",
					urls: [
						{
							url: url,
							name: "Leer Comic",
						},
					],
				},
			],
		};
	}

	async watch(url) {
		const watchRes = await this.req(url);
		const imgLista = await this.querySelectorAll(watchRes, ".wp-content img");
		let pages = []

		for (const element of imgLista) {
			const imgSrc = await this.getAttributeText(element.content,"img", "data-src")
			const baseUrl = await this.getSetting("comic")

			if (imgSrc.match(baseUrl) !== null){
				pages.push(imgSrc)
			} else {
				//console.log(`[Debug] Imagen Omitida: ${imgSrc}`)
			}
		}

		return {
			urls: pages,
		};
	}
}
