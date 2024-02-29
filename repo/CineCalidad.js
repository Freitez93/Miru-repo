// ==MiruExtension==
// @name         CineCalidad
// @version      v0.1
// @author       Freitez93
// @lang         es
// @license      MIT
// @package      cinecalidad
// @type         bangumi
// @icon         https://wow.cinecalidad.gg/wp-content/themes/Cinecalidad/assets/img/favicon.png
// @webSite      https://wow.cinecalidad.gg
// @nsfw         false
// ==/MiruExtension==

export default class extends Extension {
	async req(url) {
		const baseUrl = url.replace(await this.getSetting("cc"), "");
		return this.request(baseUrl, {
			headers: {
				"Miru-Url": await this.getSetting("cc"),
			},
		});
	}

	async load() {
		this.registerSetting({
			title: "Page Url",
			key: "cc",
			type: "input",
			desc: "Esta es la URL de donde se obtienen las peliculas y series",
			defaultValue: "https://wow.cinecalidad.gg",
		});
	}

	async latest(page) {
		const latestRes = await this.req(`/page/${page}/`);
		const itemMovies = await this.querySelectorAll(latestRes, "#archive-content > article");

		let arrayItems = await Promise.all(
			itemMovies.map(async (item) => ({
				title: await this.getAttributeText(item.content, "img", "alt"),
				url: await this.getAttributeText(item.content, "a", "href"),
				cover: await this.getImg(item.content),
			}))
		);
	
		return arrayItems.filter(poster =>
			poster.title.match(/Netflix|Disney Plus|HBO MAX/) === null
		);
	}

	async createFilter(filter) {
		if (filter) console.log(filter);

		const mainbar = {
			title: "Categoria",
			max: 1,
			min: 0,
			default: "",
			options: {
				"/#destacado": "Destacados",
				"/ver-serie": "Series",
				"/genero-de-la-pelicula/peliculas-en-calidad-4k": "4K UHD",
			},
		}
		const genres = {
			title: "Generos",
			max: 1,
			min: 0,
			default: "",
			options: {
				"accion":"Acción",
				"animacion":"Animación",
				"anime":"Anime",
				"aventura":"Aventura",
				"belico":"Bélico",
				"ciencia-ficcion": "Ciencia Ficcion",
				"crimen":"Crimen",
				"comedia":"Comedia",
				"documental":"Documental",
				"drama":"Drama",
				"familiar":"Familiar",
				"fantasia":"Fantasia",
				"historia":"Historia",
				"musica":"Musica",
				"misterio":"Misterio",
				"terror":"Terror",
				"suspense":"Suspense",
				"romance":"Romance",
				"universo-marvel":"Marvel"
			}
		}

		return {
			mainbar,
			genres
		}
	}

	async search(kw, page, filter) {
		let textSearch = (!kw) ? "" : `?s=${kw}`;
		let searchUrl = `/page/${page}/${textSearch}`;

		if (filter) {
			if (filter.mainbar[0]){ //----- Detecto Categorias
				searchUrl = `${filter.mainbar[0]}/page/${page}`
			} else if (filter.genres[0]) { //----- Detecto Etiquetas
				searchUrl = `/genero-de-la-pelicula/${filter.genres[0]}/page/${page}`
			}
		}

		console.log(`[Debug] searchUrl: ${searchUrl}`)
		const searchRes = await this.req(searchUrl);
		const itemMovies = await this.querySelectorAll(searchRes, "#archive-content > article");

		let arrayItems = await Promise.all(
			itemMovies.map(async (item) => ({
				title: await this.getAttributeText(item.content, "img", "alt"),
				url: await this.getAttributeText(item.content, "a", "href"),
				cover: await this.getImg(item.content),
			}))
		);
	
		return arrayItems.filter(poster =>
			poster.title.match(/Netflix|Disney Plus|HBO MAX/) === null
		);
	}

	async detail(url) {
		const detailRes = await this.req(url);
		const isPelicula = url.match("/ver-serie/") ? false : true
		let isDesc = await this.querySelectorAll(detailRes, "table p");
		for (const part of isDesc) {
			if (part.content.match(/&nbsp;|\n/) === null) {
				isDesc = part.content.replace("<p>", "").replace("</p>", "")
				break;
			}
		}

		//------- Informacion de la Pelicula/Serie
		const title = await this.querySelector(detailRes, ".single_left > h1").text;
		const cover = await this.getImg(detailRes, "table img")
		const desc = isDesc

		if (isPelicula) { //----- Pelicula
			return {
				title,
				cover,
				desc,
				episodes: [{
					title: "Directory",
					urls: [{
						name: "Ver Pelicula",
						url
					}],
				}, ],
			}
		} else { //----- Serie
			const nbTemp = await this.querySelectorAll(detailRes, "#jstab")
			let arrayTemp=[], nb = 1;

			for (const element of nbTemp){ //----- Dividimos por Temporadas
				const nbCapitulos = await this.querySelectorAll(element.content, ".episodios > li")
				let arrayCap=[]

				if (nbCapitulos){
					for (const element of nbCapitulos){ //----- Dividimos por Capitulos
						const num = await this.querySelector(element.content, ".numerando").text
						const nam = await this.querySelector(element.content, "a").text

						arrayCap.push({
							name: `${num}: ${nam}`,
							url: await this.getAttributeText(element.content, "a", "href"),
						})
					}

					arrayTemp.push({
						title: `Temporada - ${nb++}`,
						urls: arrayCap
					})
				}
			}

			return {
				title,
				cover,
				desc,
				episodes: arrayTemp,
			}
		}
	}

	async watch(url) {
		const watchRes = await this.req(url); //----- Cargamos la informacion de la Pagina

		const opLinks = await this.querySelectorAll(watchRes, "#playeroptionsul .dooplay_player_option")
		const arrayLinks = await Promise.all(
			opLinks.map(async (item) => ({
				lang: await this.getAttributeText(item.content, "img", "src"),
				serv: await this.getAttributeText(item.content, "li", "data-option")
			}))
		);
		let episodeUrl = ""

		for (const value of arrayLinks){
			const isSpanish = (value.lang.match('es.png') !== null) ? true : false
			const needFrame = (value.serv.match(/vipembed|embed/) !== null) ? true : false

			if (isSpanish){
				if (!needFrame){
					const dwishLinkRes = await this.request("", {
						headers: {
							"Miru-Url": value.serv
						}
					})
					const directUrlMatch = dwishLinkRes.match(/https:\/\/[^\s'"]+\.(?:mp4|m3u8)[^\s'"]*/);
					const directUrl = directUrlMatch ? directUrlMatch[0] : ""

					if (directUrl != "") {
						episodeUrl = directUrl
						break
					}
				}
			}
		}

		return {
			type: "hls",
			url: episodeUrl || "",
		};
	}

	async getImg(html, find){
		if (typeof (html) == 'string'){
			if (find){
				const result = await this.querySelectorAll(html, find)

				for (const element of result){
					const content = element.content
					const check = content.match(/https:\/\/[^\s'"]+\.(?:jpg|png)/)

					if (check !== null){
						return check[0]
					}
				}
			} else {
				const check = html.match(/https:\/\/[^\s'"]+\.(?:jpg|png)/)

				if (check !== null){
					return check[0]
				}
			}
		} else {
			console.log(`[Debug] El tipo de element ingresado es: ${typeof html}`)
		}
	}
}
