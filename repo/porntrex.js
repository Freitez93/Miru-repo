// ==MiruExtension==
// @name         PornTrex
// @version      v0.0.1
// @author       Freitez93
// @lang         en
// @license      MIT
// @package      porntrex
// @type         bangumi
// @icon         https://ptx.cdntrex.com/images/logo.white.png
// @webSite      https://www.porntrex.com
// @nsfw         true
// ==/MiruExtension==

export default class extends Extension {
	async latest(page) {
		const latestRes = await this.request(`/latest-updates/${page}/`);
		const bsxList = await this.querySelectorAll(latestRes, ".video-list > div");
		const movies = [];

		for (const element of bsxList) {
			const html = await element.content;
			const title = await this.getAttributeText(html, "img", "alt");
			const cover = html.match(/ptx\.cdntrex\.com[^\s'"]+\.(?:jpg|png)/)[0];
			const url = await this.getAttributeText(html, "a", "href");

			movies.push({
				title,
				url,
				cover: `https://${cover}`,
			});
		}
		return movies;
	}

	async createFilter(filter) {
		const mainbar = {
			title: "Categorias",
			max: 1,
			min: 0,
			default: "",
			options: {
				"/categories/4k-porn":"4K Porn",
				"/categories/hd":"HD Porn",
				"/categories/wife":"Wife",
				"/categories/vintage":"Vintage",
				"/categories/swallow":"Swallow",
				"/categories/babysitter":"Babysitter",
				"/categories/teen":"Teen",
				"/categories/threesome":"Threesome",
				"/categories/double-penetration":"Double Penetration (DP)",
				"/categories/czech":"Czech",
				"/categories/czech-massage":"Czech Massage",
				"/categories/bbw":"BBW",
				"/categories/orgy":"Orgy",
				"/categories/celebrities":"Celebrities",
				"/categories/office":"Office",
				"/categories/titfuck":"Titfuck",
				"/categories/interracial":"Interracial",
				"/categories/black":"Black",
				"/categories/cuckold":"Cuckold",
				"/categories/big-ass":"Big Ass",
				"/categories/old-and-young":"Old and Young",
				"/categories/fantasy":"Fantasy",
				"/categories/ebony":"Ebony",
				"/categories/riding":"Riding",
				"/categories/mature":"Mature",
				"/categories/anal":"Anal",
				"/categories/arab":"Arab",
				"/categories/asian":"Asian",
				"/categories/japanese":"Japanese",
				"/categories/indian":"Indian",
				"/categories/hungarian":"Hungarian",
				"/categories/doggystyle":"Doggystyle",
				"/categories/school-girl":"School Girl",
				"/categories/massage":"Massage",
				"/categories/big-tits":"Big Tits",
				"/categories/public":"Public",
				"/categories/gangbang":"Gangbang",
				"/categories/latina":"Latina",
				"/categories/babe":"Babe",
				"/categories/lingerie":"Lingerie",
			}
		}
		const orden = {
			title: "Orden",
			max: 1,
			min: 0,
			default: "",
			options: {
				"/most-popular":"Most Viewed",
				"/top-rated":"Top Rated",
				"/longest":"Longest",
				"/most-commented":"Most Commented",
				"/most-favourited":"Most Favourited"
			}
		}

		return {
			mainbar,
			orden
		}
	}

	async search(kw, page, filter) {
		let searchUrl;

		if (kw){
			const textSearch = kw.replaceAll(" ", "-");
			searchUrl = `/search/${textSearch}/${page}/`
		} else {
			if (filter.mainbar[0] || filter.orden[0]){
				searchUrl = `${filter.mainbar[0] || ""}${filter.orden[0] || ""}/${page}/`
			} else {
				searchUrl = `/latest-updates/${page}/`
			}
		}

		const searchRes = await this.request(searchUrl);
		const bsxList = await this.querySelectorAll(searchRes, ".video-list > div");
		const movies = [];

		for (const element of bsxList) {
			const html = await element.content;
			const title = await this.getAttributeText(html, "img", "alt");
			const cover = html.match(/ptx\.cdntrex\.com[^\s'"]+\.(?:jpg|png)/)[0];
			const url = await this.getAttributeText(html, "a", "href");

			movies.push({
				title,
				url,
				cover: `https://${cover}`,
			});
		}
		
		return movies;
	}

	async detail(url) {
		const detailRes = await this.request("", {
			headers: {
				"Miru-Url": url,
			},
		});

		const title = await this.querySelector(detailRes, "title").text;
		const cover = detailRes.match(/ptx\.cdntrex\.com[^\s'"]+preview\.(?:jpg|png)/)[0]
		const desc = await this.querySelector(detailRes, '.des-link').text || "Sin Descripción";

		let episodeUrl = detailRes.match(/https:(.+?\.mp4)/g);
		let patternQlt = ["_360p", "_480p", "_720p", "_1080p", "_1440p", "_2160p"]
		let qualityUrl = [], nb=0;

		for (const pattern of episodeUrl) {
			qualityUrl.push({
				name: `Quality: ${patternQlt[nb++]}`,
				url: pattern
			})
		}

		return {
			title,
			cover: `https://${cover}`,
			desc,
			episodes: [
				{
					title: "Directory",
					urls: qualityUrl,
				},
			],
		};
	}

	async watch(url) {
		return {
			type: "mp4",
			url: url || "",
		};
	}
}
