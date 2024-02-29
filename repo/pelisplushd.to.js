// ==MiruExtension==
// @name         PelisPlusHD.to
// @version      v0.0.1
// @author       Freitez93
// @lang         es
// @license      MIT
// @package      pelisplushd.to
// @type         bangumi
// @icon         https://www17.pelisplushd.to/static/images/logo/favicon.png
// @webSite      https://www17.pelisplushd.to
// @nsfw         false
// ==/MiruExtension==
const webSite = "https://www17.pelisplushd.to"

export default class extends Extension {
	async latest(page) {
		const res = await this.request("/peliculas/estrenos?page=" + page);
		const bsxList = await this.querySelectorAll(res, ".Posters-link");
		const novel = [];

		for (const element of bsxList) {
			const html = await element.content;
			const title = await this.querySelector(html, ".listing-content > p").text;
			const cover = webSite + await this.querySelector(html, "img").getAttributeText("src");
			const url = webSite + await this.getAttributeText(html, "a", "href");
			novel.push({
				title: title,
				url,
				cover
			});
		}
		return novel;
	}

	async createFilter(filter) {
		if (filter) {
			console.log(filter)
		}
		const mainbar = {
			title: "",
			max: 1,
			min: 0,
			default: "/peliculas/estrenos",
			options: {
				"/peliculas/estrenos": "Peliculas",
				"/series/estrenos": "Series",
				"/generos/dorama": "Doramas",
				"/animes/estrenos": "Animes",
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
		let urlMy = `/search?s=${kw}`

		if (!kw) {
			if (filter.genres[0] != "") {
				urlMy = filter.genres[0]
				if (filter.mainbar[0] == "/peliculas/estrenos"){
					urlMy = urlMy + "/peliculas"
				} else if (filter.mainbar[0] == "/series/estrenos"){
					urlMy = urlMy + "/series"
				} else if (filter.mainbar[0] == "/animes/estrenos"){
					urlMy = urlMy + "/animes"
				}
				urlMy = urlMy + `?page=${page}`
			} else {
				urlMy = filter.mainbar[0] + `?page=${page}`
			}
		}

		const res = await this.request(urlMy);
		const bsxList = await this.querySelectorAll(res, "div.Posters > a");
		const novel = [];

		for (const element of bsxList) {
			const html = await element.content;
			const title = await this.querySelector(html, "div.listing-content > p").text;
			const cover = webSite + await this.querySelector(html, "img").getAttributeText("src");
			const url = webSite + await this.getAttributeText(html, "a", "href");
			novel.push({
				title: title,
				url,
				cover
			});
		}
		return novel;
	}

	async detail(url) {
		const res = await this.request("", {
			headers: {
				"Miru-Url": url,
			},
		});

		const title = await this.querySelector(res, "div.card-body > div  > div > h1").text;
		const cover = webSite + await this.querySelector(res, "img").getAttributeText("src");
		const desc = await this.querySelector(res, "div.text-large").text;
		const nbSeason = await this.querySelectorAll(res, "div.tab-content > div.tab-pane");
		const arrayTemp = []
		let nb = 0;

		if (url.indexOf("pelicula") != -1) {
			return {
				title: title.trim(),
				cover,
				desc: desc.trim(),
				episodes: [{
					title: "Directory",
					urls: [{
						name: "Ver"+title,
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
					for (const nbCapitulo of nbCapitulos) { //Dividimos por Capitulos
						const html2 = await nbCapitulo.content
						const url = await this.getAttributeText(html2, "a", "href");

						let name = await this.querySelector(html2, "a").text
						urlsEp.push({
							name: name.replace("\n", " "),
							url: webSite + await this.getAttributeText(html2, "a", "href")
						})
					}

					arrayTemp.push({
						title: "Temporada 0" + nb,
						urls: urlsEp
					})
				}
			}
		}

		return {
			title: title.trim(),
			cover,
			desc,
			episodes: arrayTemp,
		};
	}

	async watch(url) {
		const res = await this.request("", {
			headers: {
				"Miru-Url": url,
			},
		});

		const opction_1 = await this.querySelectorAll(res, ".playurl")
		const opction_2 = await this.querySelectorAll(res, "#link_url > span")
		const isFound = opction_1[0] ? opction_1 : opction_2
		const regex = /https:\/\/[^\s'"]+/
		let episodeUrl = "";
		let arrayLinks = [];

		if (isFound[0]) {
			console.log("isFound - " + isFound[0])
			for (const pattern of isFound) {
				const arrayDiv = await pattern.content
				arrayLinks.push(arrayDiv.match(regex)[0])
			}
		} else {
			return console.log("[Error] No se encontraron links")
		}

		for (const pattern of arrayLinks) {
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
}