// ==MiruExtension==
// @name         PelisPlusHD.nz
// @version      v0.3
// @author       Freitez93
// @lang         es
// @license      MIT
// @package      pelisplushd.nz
// @type         bangumi
// @icon         https://pelisplushd.nz/images/logo/favicon.png
// @webSite      https://pelisplushd.nz
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
	async req(url) {
		const baseUrl = url.replace(await this.getSetting("pelisplus"), "");
		return this.request(baseUrl, {
			headers: {
				"Miru-Url": await this.getSetting("pelisplus"),
			},
		});
	}

	async load() {
		this.registerSetting({
			title: "Page Base Url",
			key: "pelisplus",
			type: "input",
			desc: "Esta es la URL de donde se obtienen las peliculas y series",
			defaultValue: "https://pelisplushd.nz",
		});
	}

	async latest(page) {
		const res = await this.req(`/peliculas?page=${page}`);
		const bsxList = await this.querySelectorAll(res, ".Posters-link");
		const movies = [];

		for (const element of bsxList) {
			const html = await element.content;
			const title = await this.querySelector(html, ".listing-content > p").text;
			const cover = await this.querySelector(html, "img").getAttributeText("src");
			const url = await this.getAttributeText(html, "a", "href");
			movies.push({
				title: title.replace(/.\(\d\d\d\d\)/gi, ""),
				url,
				cover
			});
		}
		return movies;
	}

	async createFilter(filter) {
		if (filter) {
			console.log(filter)
		}
		const mainbar = {
			title: "",
			max: 1,
			min: 0,
			default: "/peliculas",
			options: {
				"/peliculas": "Peliculas",
				"/series": "Series",
				"/generos/dorama": "Doramas",
				"/animes": "Animes",
			},
		}
		const genres = {
			title: "Generes",
			max: 1,
			min: 0,
			default: "",
			options: {
				"/generos/accion":"Acción",
				"/generos/animacion":"Animación",
				"/generos/aventura":"Aventura",
				"/generos/comedia":"Comedia",
				"/generos/crimen":"Crimen",
				"/generos/documental":"Documental",
				"/generos/drama":"Drama",
				"/generos/fantasia":"Fantasia",
				"/generos/guerra":"Guerra",
				"/generos/historia":"Historia",
				"/generos/romance":"Romance",
				"/generos/suspense":"Suspense",
				"/generos/terror":"Terror",
				"/generos/western":"Western",
				"/generos/misterio":"Misterio",
				"":"Nada",
			}
		}

		return {
			mainbar,
			genres
		}
	}

	async search(kw, page, filter) {
		let searchUrl = `/peliculas?page=${page}`

		if (kw) {
			searchUrl = `/search?s=${kw.replaceAll(" ", "+")}&page=${page}`
		} else {
			if (filter.mainbar[0] || filter.genres[0]){
				searchUrl = `${filter.genres[0] || ""}${filter.mainbar[0] || ""}?page=${page}`

				if (filter.mainbar[0].includes('/dorama') == true){
					searchUrl = `${filter.mainbar[0]}?page=${page}`
				}
			}
		}

		//console.log(searchUrl)
		const searchRes = await this.req(searchUrl);
		const bsxList = await this.querySelectorAll(searchRes, ".Posters-link");
		const movies = [];

		for (const element of bsxList) {
			const html = await element.content;
			const title = await this.querySelector(html, ".listing-content > p").text;
			const cover = await this.querySelector(html, "img").getAttributeText("src");
			const url = await this.getAttributeText(html, "a", "href");
			movies.push({
				title: title.replace(/.\(\d\d\d\d\)/gi, ""),
				url,
				cover
			});
		}
		return movies;
	}

	async detail(url) {
		const detailRes = await this.req(url);

		//------- Informacion de la Pelicula/Serie
		const title = await this.querySelector(detailRes, "div.card-body > div  > div > h1").text;
		const cover = await this.querySelector(detailRes, "img").getAttributeText("src");
		const desc = await this.querySelector(detailRes, ".text-large").text;
		//------- Variables del Script
		const nbSeason = await this.querySelectorAll(detailRes, "div.tab-content > div.tab-pane");
		const arrayTemp = []
		let nb = 0;

		if (url.indexOf("pelicula") != -1) {
			return {
				title: title.trim(),
				cover: cover,
				desc: desc.trim(),
				episodes: [{
					title: "Directory",
					urls: [{
						name: "Ver Pelicula",
						url
					}],
				}, ],
			}
		} else {
			for (const element of nbSeason) { //Dividimos por Temporadas
				nb++
				if (typeof(element) == 'object') {
					const html = await element.content;
					const nbCapitulos = await this.querySelectorAll(html, "a")
					const urlsEp = []
					if (nbCapitulos.length != 0){
						for (const nbCapitulo of nbCapitulos) { //Dividimos por Capitulos
							const html2 = await nbCapitulo.content
							const name = await this.querySelector(html2, "a").text
				
							urlsEp.push({
								name: name.replaceAll("\n", " "),
								url: await this.getAttributeText(html2, "a", "href")
							})
						}

						arrayTemp.push({
							title: "Temporada 0" + nb,
							urls: urlsEp
						})
					}
				}
			}
		}

		return {
			title: title.trim(),
			cover,
			desc: desc.replaceAll("\n", ""),
			episodes: arrayTemp,
		};
	}

	async watch(url) {
		const watchRes = await this.req(url); //----- Cargamos la informacion de la Pagina

		const iframe = await this.querySelector(watchRes, "#video-content > iframe")
		const iframeLink = iframe.content.match(/https:\/\/streamsito.com[^\s'"]+/)[0]
		const servLinks = iframeLink ? await this.getServLink(iframeLink) : []
		let episodeUrl = ""

		for (const pattern of servLinks) {
			const dwishLinkRes = await this.request("", {
				headers: {
					"Miru-Url": pattern
				}
			})
			const directUrlMatch = dwishLinkRes.match(/https:\/\/[^\s'"]+\.(?:mp4|m3u8)[^\s'"]*/);
			const directUrl = directUrlMatch ? directUrlMatch[0] : ""

			if (directUrl != "") {
				episodeUrl = directUrl
				break
			}
		}

		return {
			type: "hls",
			url: episodeUrl || "",
		};
	}

	async getServLink(url) {
		const result = await this.request("", {
			headers: {
				"Miru-Url": url
			}
		});

		const servLinks = []
		const html = await this.querySelectorAll(result, ".OD_1 > li")
		html.forEach(element => {
			const a = element.content
			const b = a.match(/https:\/\/[^\s'"]+/)
			servLinks.push(b[0]||"")
		});
		return servLinks
	}
}