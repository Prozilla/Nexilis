/**
 * Uses the Reddit API to fetch data from reddit.com
 * Documentation: https://www.reddit.com/dev/api/
 * 
 * Made by Prozilla
 */

//#region VARIABLES

// Feed settings
let currentSubreddits = [
	"itookapicture", // Default subreddit
];

let currentFilterIndex;
const filters = [
	"best",
	"hot",
	"new",
	"top",
	"rising",
	"controversial",
];

let currentFeed = {
	subreddits: null,
	filterIndex: null,
};

// List elements
let postsList = document.querySelector("#posts-list");
const filterList = document.querySelector("#filter-list");
const subredditList = document.querySelector("#subreddits-list ul");
const customFeedsList = document.querySelector("#feeds-list");

// Input elements
const hideSensitiveContentToggle = document.querySelector("#sensitive-content");

const sideMenu = document.querySelector("#side-menu");
const pageContent = document.querySelector("#page-content");
const feedName = document.querySelector("#feed-name");
const subredditOptions = document.querySelector("#subreddit-options");
const postViewer = document.querySelector("#post-viewer");
const scrollUp = document.querySelector("#scroll-up");

// Header
let header;
let searchInput;
let searchResultList;

// Meta settings
let feedId = 0;
const maxPosts = 10;
let postCount = 0;
let lastPostId;
let loadingNewPosts = false;
let allowSensitiveContent = false;

// Fallback media
const fallbackSubredditIcon = "media/Dragon.svg";

// Style properties
const style = getComputedStyle(document.querySelector(":root"));
const defaultColors = [
	style.getPropertyValue("--accent-color-a").trim(),
	style.getPropertyValue("--red").trim(),
	style.getPropertyValue("--yellow").trim(),
	style.getPropertyValue("--green").trim(),

	style.getPropertyValue("--text-color-a").trim(),
	style.getPropertyValue("--background-color-a").trim(),
];

// URL queries (aka parameters)
let queries = getURLParameters();
if (queries && queries["post"] != undefined)
	showPostViewer(queries["post"]);

// OAuth
const code = (queries && queries["code"] != undefined) ? queries["code"] = "" : null;

//console.log(code);

/* // METHOD 1
const http = new XMLHttpRequest();
const httpParameters = `grant_type=authorization_code&code=${code}&redirect_uri=https%3A%2F%2Fnexilis.netlify.app%2F`;

http.open("POST", "https://www.reddit.com/api/v1/access_token");
http.setRequestHeader("Access-Control-Allow-Origin","*");
http.setRequestHeader("Access-Control-Allow-Credentials", "true");
http.setRequestHeader("Access-Control-Allow-Methods", "POST");
http.setRequestHeader("Access-Control-Allow-Headers", "Content-Type");

http.onreadystatechange = function() {
    if (http.readyState == 4 && http.status == 200) {
        alert(http.responseText);
    }
}

http.send(httpParameters);*/

/* // METHOD 2
(async () => {
	const rawResponse = await fetch("https://www.reddit.com/api/v1/access_token", {
		headers: {
			"Accep": "application/json",
      		"Content-Type": "application/json",
		},
		//method: "POST",
		data: {
			"grant_type": "authorization_code",
			"code": code,
			"redirect_uri": "https%3A%2F%2Fnexilis.netlify.app%2F",
		},
	});
	const content = await rawResponse.json();
  
	console.log(content);
})();*/

// METHOD 3

/*authorize(code);

async function authorize(token) {
	if (!token)
		return;

	const encode = window.btoa(code);
	const redditTokens = await Axios.post("https://www.reddit.com/api/v1/access_token", 
		`grant_type=authorization_code&code=${code}&redirect_uri=https://nexilis.netlify.app/`, {
		headers: {
			"Authorization": `Basic ${encode}`,
			"Content-Type": 'application/x-www-form-urlencoded'
		}
	}).then(res => {
		if (res.data.error) {
			return toast.error("Please re-authenticate");
		}

		return res.data;
	}).catch(console.log);
}*/

//#endregion

//#region GET

/**
 * Calculate the time passed since a unix date
 * @param {number} unixDate - Date in unix format
 */
function getTimePassedSinceDate(unixDate) {
	const date = Math.abs((new Date(unixDate * 1000).getTime() / 1000).toFixed(0));
	const currentDate = Math.abs((new Date().getTime() / 1000).toFixed(0));

	const timePassed = currentDate - date;

	const years = Math.floor(timePassed / 30758400);
	const days = Math.floor(timePassed / 86400);
	const hours = Math.floor(timePassed / 3600) % 24;
	const minutes = Math.floor(timePassed / 60) % 60;
	const seconds = timePassed % 60;

	let time;
	if (years > 0) {
		time = years > 1 ? years + " years" : years + " year";
	} else if (days > 0) {
		time = days > 1 ? days + " days" : days + " day";
	} else if (hours > 0) {
		time = hours > 1 ? hours + " hours" : hours + " hour";
	} else if (minutes > 0) {
		time = minutes > 1 ? minutes + " minutes" : minutes + " minute";
	} else {
		time = seconds > 1 ? seconds + " seconds" : seconds + " second";
	}

	return time;
}

function renderHTML(string) {
	return string.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(new RegExp("<!-- [A-z]* -->"), "");
}

/**
 * Turn post media into html
 * @param {Object} post - The post with the media that needs to be rendered
 * @returns {string} Post media in html format
 */
async function renderPostMedia(post) {
	if (post.crosspost_parent_list)
		post = post.crosspost_parent_list[0];

	const classes = ["post-media"];
	if (post.spoiler || post.over_18)
		classes.push("blur");

	let media;
	if (post.media || (post.preview && post.preview.reddit_video_preview)) {
		let source;
		let isPreview = false;

		if (post.media && post.media.reddit_video) {
			source = post.media.reddit_video.fallback_url.substring(0, post.media.reddit_video.fallback_url.length - 16)
		} else if (post.preview) {
			source = post.preview.reddit_video_preview.fallback_url;
			isPreview = true;
		}

		if (source) {
			if (!isPreview) {
				// Fetch audio
				const audioSource = source.replace(new RegExp("DASH_[0-9]+.mp4"), "DASH_audio.mp4");
				const audioResponse = await fetch(audioSource);
				let audio = "";

				if (audioResponse.status == 200)
					audio = `<audio preload="auto" controls loop>
						<source src=\"${audioSource}" type="audio/mp4">
					</audio>`;

				media = `<video class="${classes.length ? classes.join(" ") : classes[0]}" preload="auto" controls loop playsinline>
					<source src=\"${source}" type="video/mp4">
					${audio}
				</video>`;
			} else {
				media = `<video class="${classes.length ? classes.join(" ") : classes[0]}" preload="auto" controls loop playsinline>
					<source src=\"${source}" type="video/mp4">
				</video>`;
			}
		} else if (post.media.oembed) {
			media = `<img class="${classes.length ? classes.join(" ") : classes[0]}" src="${post.media.oembed.thumbnail_url}" loading="lazy">`;
		}
	} else if (post.preview) {
		if (post.preview.images[0].variants.gif) {
			media = `<img class="${classes.length ? classes.join(" ") : classes[0]}" src="${renderHTML(post.preview.images[0].variants.gif.source.url)}" loading="lazy">`;
		} else {
			media = `<img class="${classes.length ? classes.join(" ") : classes[0]}" src="${renderHTML(post.preview.images[0].source.url)}" loading="lazy">`;
		}
	}

	return media ? `<div class="post-media-container"><div class="post-media-inner-container">${media}</div></div>` : "";
}

/**
 * Renders a recursively comment in html format
 * @param {Object} comment - The comment on top of the thread that needs to be rendered
 * @returns {string} Comment and its replies in html format
 */
async function renderComment(comment) {
	let replies = comment.data.replies ? Array.from(comment.data.replies.data.children) : null;

	// Get user icon (use default Reddit avatars as fallback)
	let icon = `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_${Math.floor(Math.random() * 7)}.png`;
	if (comment.data.author != "[deleted]")
		icon = await fetch(`https://www.reddit.com/user/${comment.data.author}/about.json`).then((result) => result.json()).then(result => {
			return result.data.icon_img;
		});
	
	let thread = `<span class="comment" style="margin-left: ${comment.data.depth * 25}px;">
		<p class="comment-header"><img src="${icon}" loading="lazy"> ${comment.data.author} &middot; ${getTimePassedSinceDate(comment.data.created)} ago</p>
		${renderHTML(comment.data.body_html).replace("<div class=\"md\">", "<div class=\"comment-body\">")}
	</span>`;

	// ${"<i class=\"comment-line\"></i>".repeat(comment.data.depth + 1)}

	let moreReplies;

	// Render replies recursively
	if (replies) {
		// for (let i = 0; i < replies.length; i++)
		// 	if (replies[i].kind == "more" && replies[i].data.count > 0) {
		// 		console.log(replies[i]);
		// 		moreReplies = replies[i].data.children;
		// 		Fetch comment by id (moreReplies is a list of id's)
		// 	}
		// 
		// if (moreReplies)
		// 	replies += moreReplies;

		for (let i = 0; i < replies.length; i++)
			if (replies[i].kind != "more") {
				replies[i] = await renderComment(replies[i]);
			} else {
				replies[i] = "";
			}

		thread += replies.join("");
	}

	return thread;
}

/**
 * Returns the icon of a subreddit or the default subreddit icon if there is none
 * @param {string} subreddit - The name of the subreddit
 * @returns {string} Subreddit icon in html format
 */
async function getSubredditIcon(subreddit) {
	let subredditIcon = `<img class="subreddit-icon" src="${fallbackSubredditIcon}">`;
	if (subreddit != "all") {
		await fetch(`https://www.reddit.com/r/${subreddit}/about.json`).then(function(result) {
			return result.json();
		}).then(function(result) {
			const source = result.data.icon_img ? result.data.icon_img : result.data.community_icon;
			if (source)
				subredditIcon = `<img class="subreddit-icon" src="${source}" loading="lazy">`;
		}).catch(function(error) {
			console.log(error);
		});
	}

	return subredditIcon;
}

/**
 * Compares two arrays
 * @param {Array} array1 - First array
 * @param {Array} array2 - Second array
 * @returns Whether the two arrays are equal
 */
function arraysEqual(array1, array2) {
	if (array1 === array2) 
		return true;
	if (array1 == null || array2 == null) 
		return false;
	if (array1.length !== array2.length) 
		return false;

	for (var i = 0; i < array1.length; ++i)
		if (array1[i] !== array2[i]) 
			return false;

	return true;
}

function getHueValue(color) {
	let r, g, b;

	if (color.startsWith("#")) {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(color);
		r = parseInt(result[1], 16);
		g = parseInt(result[2], 16);
		b = parseInt(result[3], 16);
	} else {
		color = color.replace(/[^\d,]/g, '').split(',');
		r = color[0];
		g = color[1];
		b = color[2];
	}
    

	let rabs, gabs, babs, rr, gg, bb, h, s, v, diff, diffc;

    rabs = r / 255;
    gabs = g / 255;
    babs = b / 255;

    v = Math.max(rabs, gabs, babs),
    diff = v - Math.min(rabs, gabs, babs);
    diffc = c => (v - c) / 6 / diff + 1 / 2;

    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(rabs);
        gg = diffc(gabs);
        bb = diffc(babs);

        if (rabs === v) {
            h = bb - gg;
        } else if (gabs === v) {
            h = (1 / 3) + rr - bb;
        } else if (babs === v) {
            h = (2 / 3) + gg - rr;
        }

        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
	
	return Math.round(h * 360);
}

function getClosestDefaultColor(color) {
	const hue = getHueValue(color);

	let closestDefaultColor;
	let minHueDifference = 240;

	defaultColors.forEach(defaultColor => {
		const hueDifference = Math.abs(hue - getHueValue(defaultColor));

		if (hueDifference < minHueDifference) {
			closestDefaultColor = defaultColor;
			minHueDifference = hueDifference;
		}
	});

	return closestDefaultColor;
}

function getFormattedNumber(value) {
	return value > 999999 ? Math.sign(value) * ((Math.abs(value) / 1000000).toFixed(1)) + "m" : value > 999 ? Math.sign(value) * ((Math.abs(value) / 1000).toFixed(1)) + "k" : value;
}

//#endregion

//#region SET

function getURLParameters() {
	let parameters = window.location.search != "" ? {} : null;

	if (parameters)
		window.location.search.substring(1).split("&").forEach(query => 
			parameters[query.split("=")[0]] = query.split("=")[1]
		);

	return parameters;
}

function setURLParameter(key, value) {
	let url = location.protocol + '//' + location.host + location.pathname;
	queries = getURLParameters();

	if (!queries && value != null) {
		// Add first query
		url += `?${key}=${value}`;
	} else {
		if (queries[key] == undefined && value != null) {
			// Add query
			url += window.location.search + `&${key}=${value}`;
		} else if (queries[key] != undefined) {
			if (value == null) {
				// Remove query
				delete queries[key];
			} else {
				// Change query
				queries[key] = value;
			}

			if (Object.keys(queries).length > 0) {
				// Add parameters to url
				let parameters = [];
				for (const [parameterKey, parameterValue] of Object.entries(queries))
					parameters.push(`${parameterKey}=${parameterValue}`);
				url += "?" + parameters.join("&");
			}
		}
	}

	window.history.pushState({ path: url }, "", url);
}

//#endregion

//#region SET UP

function setUpPage() {
	// Set element properties
	if (feedName)
		feedName.disabled = true;
	allowSensitiveContent = localStorage.getItem("allowSensitiveContent") == "true" ? true : false;
	if (hideSensitiveContentToggle)
		hideSensitiveContentToggle.checked = !allowSensitiveContent;

	if (getCurrentDirectory()[0] == "") {
		// Set up feed
		if (loadCurrentFeed()) {
			toggleFilter(currentFilterIndex);
		} else {
			toggleFilter(1);
		}

		updateSubredditList();
		renderPosts();
	}

	window.addEventListener("keydown", function(event) {
		if (event.code == "Enter" && feedName.classList.contains("active"))
			saveFeed();
	});

	// Set up click events
	document.addEventListener("click", function(event) {
		let element = event.target;

		if (!header.contains(element) || element.id == "side-menu-toggle")
			searchSubreddit();

		if (sideMenu && !sideMenu.firstChild.nextSibling.contains(element) && element.id != "side-menu-toggle" && sideMenu.classList.contains("active"))
			toggleSideMenu();

		if (subredditOptions && !subredditOptions.contains(element) && feedName.classList.contains("active"))
			hideFeedName();

		if (subredditOptions && !subredditOptions.contains(element) && !customFeedsList.contains(element) && customFeedsList.classList.contains("active"))
			customFeedsList.classList.remove("active");

		if (!postViewer.firstChild?.contains(element) && postViewer.classList.contains("active")) {
			hidePostViewer();
		} else if (!element.classList.contains("blur") && postsList && postsList.contains(element) && element.nodeName != "VIDEO" && element.closest(".post") && !element.closest(".post").querySelector(".post-media-container .post-media-inner-container")?.contains(element) && element.closest(".post.user, .post.subreddit") == null) {
			showPostViewer(element.closest(".post").getAttribute("data-post-id"));
		}

		if (element.closest(".post") && element.closest(".post").querySelector(".post-media-container .post-media-inner-container .post-media") != null)
			element = element.closest(".post").querySelector(".post-media-container .post-media-inner-container .post-media");

		if (element.classList.contains("blur"))
			if (element.classList.contains("active")) {
				element.classList.remove("active");
			} else {
				element.classList.add("active");
			}
	});
	
	const headerLoadInterval = setInterval(function() {
		if (document.querySelector("header")) {
			clearInterval(headerLoadInterval);
		
			if (localHosting)
				document.querySelector("#logo").href = "/spreddit/";

			searchInput = document.querySelector("#search-bar input");
			searchResultList = document.querySelector("#search-bar #search-results");
			header = document.querySelector("header");

			// Set up input events
			searchSubreddit();
			searchInput.addEventListener("input", function (event) {
				searchSubreddit(event.target.value);
			});

			// Set up search
			searchInput.parentElement.addEventListener("click", function (event) {
				searchSubreddit(searchInput.value);
			});

			searchInput.addEventListener("keydown", function(event) {
				if (event.code == "Enter")
					window.open(`search/?q=${searchInput.value}`, "_self");
			});
		}
	}, 100);

	if (getCurrentDirectory()[0] == "search") {
		const searchLoadInterval = setInterval(function() {
			if (searchScriptLoaded) {
				clearInterval(searchLoadInterval);
				setUpSearch();
			}
		}, 100);
	}
}

setUpPage();

//#endregion

//#region POSTS

/**
 * Adds a single post to the list of posts
 * @param {string} html - A post in html format
 */
async function addPost(html) {
	if (!html)
		return;

	const div = document.createElement("div");
	div.innerHTML = html;

	const post = postsList.appendChild(div.firstChild);
	addVideoControls(post);
}

/**
 * Render a post in html format
 * @param {Object} post - The post that needs to be rendered
 * @param {boolean} includeComments - Include comments in the render
 * @returns The rendered post in html format
 */
async function renderPost(post, includeComments) {
	const subRedditName = post.subreddit_name_prefixed;
	const author = post.author;
	const title = post.title;
	const description = post.selftext_html ? renderHTML(post.selftext_html).replace("<div class=\"md\">", "<div class=\"post-description\">") : "";
	const id = post.id;

	const upvotesCount = getFormattedNumber(post.score);
	const commentsCount = getFormattedNumber(post.num_comments);
	const crosspostsCount = getFormattedNumber(post.num_crossposts);

	const comments = includeComments ? "<p id=\"loading-comments\">Loading comments...</p>" : "";

	// Flairs
	let flair = "";
	if (post.link_flair_text) {
		let backgroundColor = getClosestDefaultColor(post.link_flair_background_color);
		if (backgroundColor == defaultColors[4])
			backgroundColor = defaultColors[5];

		const color = backgroundColor == defaultColors[5] ? defaultColors[4] : defaultColors[5];

		flair = `<p title="Post flair" style="background-color: ${backgroundColor}; color: ${color};" class="post-flair">${post.link_flair_text}</p>`;
	}

	// Tags
	let tags = [];

	if (post.over_18)
		tags.push("<i title=\"Sensitive content\" class=\"red fas fa-exclamation-circle\"></i>");
	if (post.stickied)
		tags.push("<i title=\"Pinned by moderators\" class=\"green fas fa-thumbtack\"></i>");
	if (post.locked)
		tags.push("<i title=\"Locked comments\" class=\"yellow fas fa-lock\"></i>");
	if (post.archived)
		tags.push("<i title=\"Archived post\" class=\"yellow fas fa-archive\"></i>");
	if (post.spoiler)
		tags.push("<i title=\"Spoiler\" class=\"fas fa-exclamation-circle\"></i>");
	if (includeComments)
		tags.push("<button class=\"post-viewer-close button\" onclick=\"hidePostViewer()\"></button>");

	// Feed ID
	let postFeedId = "";
	if (!includeComments)
		postFeedId = `data-feed-id="${feedId}"`;

	return `<div ${postFeedId} data-post-id="${id}" class="post box">
				<span class="post-header">
					${await getSubredditIcon(post.subreddit)}
					<p>${subRedditName} &middot; Posted by u/${author} ${getTimePassedSinceDate(post.created)} ago</p>
					${tags.length ? `<span class="tags">${tags.join("")}</span>` : ""}
				</span>
				<p class="post-title">${title}</p>
				${description}
				${await renderPostMedia(post)}
				<span class="post-footer">
					<p title="Likes"><i class="far fa-heart"></i>${upvotesCount}</p>
					<p title="Comments"><i class="far fa-comment"></i>${commentsCount}</p>
					<p title="Crossposts"><i class="fas fa-random"></i>${crosspostsCount}</p>
					${flair}
				</span>
				${comments}
			</div>`;
}

function renderUser(user) {
	if (user.is_suspended)
		return;

	const name = user.name;
	const karma = getFormattedNumber(user.link_karma + user.comment_karma);
	const avatar = user.icon_img;
	const id = user.id;
	const description = (user.subreddit && user.subreddit.public_description) ? `<p class="post-description">${user.subreddit.public_description}</p>` : "";

	// Tags
	let tags = [];

	if (user.subreddit && user.subreddit.over_18)
		tags.push("<i title=\"Sensitive content\" class=\"red fas fa-exclamation-circle\"></i>");

	return `<div data-feed-id="${feedId}" data-user-id="${id}" class="post user box">
				<img class="avatar" src="${avatar}">
				<span>
					<p class="post-title">u/${name}</p>
					<p class="post-subtitle">${karma} karma</p>
					${tags.length ? `<span class="tags">${tags.join("")}</span>` : ""}
					${description}
				</span>
			</div>`
}

function renderSubreddit(subreddit) {
	const name = subreddit.display_name;
	const members = getFormattedNumber(subreddit.subscribers);
	const icon = subreddit.community_icon ? subreddit.community_icon : fallbackSubredditIcon;
	const banner = subreddit.banner_background_image ? `<img class="subreddit-banner" src="${subreddit.banner_background_image}">` : "";
	const id = subreddit.id;
	const description = subreddit.public_description_html ? renderHTML(subreddit.public_description_html).replace("<div class=\"md\">", "<div class=\"post-description\">") : "";

	// Tags
	let tags = [];

	if (subreddit.over18)
		tags.push("<i title=\"Sensitive content\" class=\"red fas fa-exclamation-circle\"></i>");

	return `<div data-feed-id="${feedId}" data-user-id="${id}" class="post subreddit box">
				${banner}
				<button class="subreddit-toggle-button button" onclick="toggleSubreddit('${name}')"></button>
				<span>
					<img class="subreddit-icon" src="${icon}">
					<p class="post-title">r/${name}</p>
					<p class="post-subtitle">${members} members</p>
					${tags.length ? `<span class="tags">${tags.join("")}</span>` : ""}
					${description}
				</span>
			</div>`
}

/**
 * Render posts of the curren feed and update the list of posts
 * TO DO: save rendered posts to avoid duplicate post in post list
 * @param {boolean} forceOverwrite - If set to true, it will remove old posts before loading new ones
 */
function renderPosts(forceOverwrite) {
	// Check if the feed has been changed
	if (!arraysEqual(currentFeed.subreddits, currentSubreddits) || currentFeed.filterIndex != currentFilterIndex || forceOverwrite || !currentSubreddits.length) {
		currentFeed.subreddits = currentSubreddits.slice();
		currentFeed.filterIndex = currentFilterIndex;

		lastPostId = null;

		// Remove old posts
		if (postsList.children.length > 1) {
			const oldPosts = Array.from(postsList.children);
			oldPosts.splice(0, 1);

			oldPosts.forEach(child => {
				postsList.removeChild(child);
			});
		}

		saveCurrentFeed();

		feedId++;
	}

	if (!currentSubreddits.length) {
		if (document.querySelector(".empty-feed-warning") == null)
			addPost("<p class=\"empty-feed-warning\">There doesn't seem to be anything here.</p>");
		return;
	}

	const url = `https://www.reddit.com/r/${currentSubreddits.length > 1 ? currentSubreddits.join("+") : currentSubreddits[0]}/${filters[currentFilterIndex]}.json?limit=${maxPosts}${lastPostId ? "&after=" + lastPostId : ""}`;

	fetch(url).then(function(result) {
			return result.json();
		}).then(async function(result) {
			const posts = result.data.children;

			if (!posts.length)
				addPost("<p>There doesn't seem to be anything here.</p>");

			let skipped = 0;
			for (let i = 0; i < posts.length; i++) {
				const post = posts[i].data;

				// Skip duplicate and sensitive posts
				const duplicatePost = document.querySelector(`[data-post-id="${post.id}"]`);
				if ((duplicatePost != null && duplicatePost.id != "post-viewer") || (post.over_18 && !allowSensitiveContent)) {
					skipped++;
					continue;
				}

				// Stop loading new posts if there's a new feed
				if (postsList.children[i - skipped] == null || (postsList.children[i - skipped].id != "filter-list" && postsList.children[i - skipped].getAttribute("data-feed-id") != feedId))
					break;

				addPost(await renderPost(post, false));

				console.log(post);

				postCount++;
				lastPostId = "t3_" + post.id;
			}

			loadingNewPosts = false;
		}).catch(function(error) {
			console.log(error);
		});
}

/**
 * Enables the post viewer and renders the selected post
 * @param {number} id - Id of the post that needs to be rendered
 */
 function showPostViewer(id) {
	setURLParameter("post", id);
	// Set post to clicked post (faster loading)

	if (postViewer.getAttribute("data-post-id") != id) {
		postViewer.setAttribute("data-post-id", id);
		postViewer.innerHTML = "";

		// Load post (has to be made into a seperate function)
		fetch(`https://www.reddit.com/comments/${id}/.json`).then(function(result) {
			return result.json();
		}).then(async function(result) {
			const post = result[0].data.children[0].data;
			const threads = result[1].data.children;

			postViewer.innerHTML = await renderPost(post, true);

			addVideoControls(postViewer);

			if (threads.length) {
				for (let i = 0; i < threads.length; i++) {
					const comment = await renderComment(threads[i]);

					if (postViewer.getAttribute("data-post-id") != id)
						return;
					
					comment.replace(/\\n\\t\\t\\t/g, "");

					const div = document.createElement("div");
					div.innerHTML = comment;

					if (i == 0)
						postViewer.firstChild.querySelector("#loading-comments").remove();

					postViewer.firstChild.appendChild(div);
				}
			}
		});
	}

	// Show post viewer
	postViewer.classList.add("active");

	for (let i = 0; i < pageContent.children.length; i++)
		if (pageContent.children[i].id != "post-viewer") {
			pageContent.children[i].style.filter = "blur(5px)";
			pageContent.children[i].style.pointerEvents = "none";
		}

	document.body.style.overflow = "hidden";
}

/**
 * Disables the post viewer
 */
function hidePostViewer() {
	setURLParameter("post");

	postViewer.classList.remove("active");

	for (let i = 0; i < pageContent.children.length; i++)
		if (pageContent.children[i].id != "post-viewer") {
			pageContent.children[i].style.filter = null;
			pageContent.children[i].style.pointerEvents = null;
		}

	document.body.style.overflow = null;
}

//#endregion

//#region VIDEO CONTROLS

/**
 * Class for video controls
 * (Does not fully support mobile yet)
 */
class videoControls {
	constructor(video) {
		const that = this;

		this.video = video;
		this.video.controls = false;

		const controlsDiv = document.createElement("div");
		controlsDiv.innerHTML = `<div class="video-controls" id="video-controls">
				<div class="primary-video-controls">
					<i class="button icon fa-solid fa-play"></i>
				</div>
				<div class="secondary-video-controls">
					<i id="pause" class="button icon fa-solid fa-pause"></i>
					<div id="progress"></div>
					<i id="volume" class="button icon fa-solid fa-volume-high">
						<div class="slider"></div>
					</i>
				</div>
			</div>`;

		this.video.parentElement.appendChild(controlsDiv.firstChild);

		this.audio = this.video.querySelector("audio");
		this.videoControls = this.video.parentElement.querySelector("#video-controls");
		this.audioSlider = this.videoControls.querySelector(".secondary-video-controls #volume .slider");
		this.videoProgress = this.videoControls.querySelector(".secondary-video-controls #progress");

		if (!this.audio) {
			this.video.parentElement.classList.add("muted");
			this.audioSlider.style.display = "none";
			this.audioSlider.parentElement.style.cursor = "auto";
			this.audioSlider.parentElement.style.color = "inherit";
		} else {
			this.setVolume(100);
		}

		this.started = false;
		this.playing = false;
		this.manuallyPaused = false;
		this.visible = isVisible(this.video);

		this.draggingVideoProgress = false;
		this.draggingAudioSlider = false;

		this.hoveringAudioSlider = false;
		this.hoveringVideo = false;

		this.video.addEventListener("contextmenu", function(event) {
			event.preventDefault();
			event.stopPropagation();
		});

		this.video.parentElement.addEventListener("mouseenter", function(event) { that.toggleControls(event); });
		this.video.parentElement.addEventListener("mouseleave", function(event) { that.toggleControls(event); });

		this.video.parentElement.querySelector(".primary-video-controls").addEventListener("click", function(event) { that.startVideo(event); });
		this.video.parentElement.querySelector(".secondary-video-controls #pause").addEventListener("click", function(event) { that.togglePause(); });
		this.video.parentElement.querySelector(".secondary-video-controls #volume").addEventListener("click", function(event) { that.toggleVolume(event); });

		this.videoProgress.addEventListener("mousedown", function(event) { that.updateVideoProgress(event); });
		this.videoProgress.addEventListener("touchstart", function(event) { that.updateVideoProgress(event); });

		document.addEventListener("mousemove", function(event) { that.onMouseMove(event); });
		document.addEventListener("mouseup", function(event) { that.onMouseUp(event); });
		document.addEventListener("scroll", function(event) { that.onScroll(event); });

		if (this.audio) {
			this.audioSlider.parentElement.addEventListener("mouseenter", function(event) { that.updateAudioSlider(event); });
			this.audioSlider.parentElement.addEventListener("mouseleave", function(event) { that.updateAudioSlider(event); });
			this.audioSlider.addEventListener("mousedown", function(event) { that.updateAudioSlider(event); });
		}

		const height = this.video.offsetWidth;
		// this.video.parentElement.style.width = height + "px";
	}

	startVideo(event) {
		event.target.closest(".video-controls").classList.add("active");

		this.progressUpdateInterval = null;
		this.videoControlsHoverExitTimeout = null;
		this.started = true;

		const that = this;
		this.video.onplay = function() {
			that.onVideoPlay(that);
		};
		this.video.onpause = function() {
			that.onVideoPause(that);
		};

		this.video.play();
	}

	onVideoPlay() {
		if (this.audio) {
			this.audio.currentTime = this.video.currentTime;
			this.audio.play();
		}

		this.video.play();

		// Keep audio in sync
		if (this.audio)
			setInterval(() => {
				if (Math.abs(this.video.currentTime - this.audio.currentTime) > 0.2)
					this.audio.currentTime = this.video.currentTime;
			}, 100);

		this.playing = true;
		this.manuallyPaused = false;
		this.video.parentElement.classList.remove("paused");

		this.progressUpdateInterval = setInterval(() => {
			this.videoProgress.style.setProperty("--progress", (this.video.currentTime / this.video.duration) * 100);
		}, 0);
	}

	onVideoPause() {
		if (this.audio)
			this.audio.pause();

		if (!this.draggingVideoProgress)
			this.playing = false;
		this.video.parentElement.classList.add("paused");

		if (this.visible)
			this.manuallyPaused = true;

		clearInterval(this.progressUpdateInterval);
	}

	togglePause() {
		if (this.playing) {
			this.video.pause();
		} else {
			this.video.play();
		}
	}

	setVideoTime(value) {
		value = Math.min(Math.max(value, 0), 100);
		this.videoProgress.style.setProperty("--progress", value);
		this.video.currentTime = value / 100 * this.video.duration;

		if (this.audio)
			this.audio.currentTime = this.video.currentTime;
	}

	toggleVolume(event) {
		if (!event.target.classList.contains("slider") && this.audio) {
			this.muted = !this.muted;

			if (this.muted) {
				this.video.parentElement.classList.add("muted");
			} else {
				this.video.parentElement.classList.remove("muted");
			}

			this.audio.volume = this.muted ? 0 : this.volume / 100;
			this.audioSlider.style.setProperty("--volume", this.audio.volume * 100);
		}
	}

	setVolume(value) {
		this.volume = Math.min(Math.max(value, 0), 100);
		this.audio.volume = this.volume / 100;
		this.audioSlider.style.setProperty("--volume", this.volume);

		if (this.volume > 0) {
			this.video.parentElement.classList.remove("muted");
			this.muted = false;
		} else {
			this.video.parentElement.classList.add("muted");
			this.muted = true;
		}
	}

	updateVideoProgress(event) {
		if (event.type == "mousedown") {
			this.draggingVideoProgress = true;
			setTimeout(() => {
				if (this.draggingVideoProgress)
					this.video.pause();
			}, 100);
		} else if (event.type == "mousemove" && this.draggingVideoProgress) {
			const position = Math.round((event.clientX - this.videoProgress.getBoundingClientRect().left) / this.videoProgress.offsetWidth * 100);
			this.setVideoTime(position);
		} else if (event.type == "mouseup" && this.draggingVideoProgress) {
			const position = Math.round((event.clientX - this.videoProgress.getBoundingClientRect().left) / this.videoProgress.offsetWidth * 100);
			this.setVideoTime(position);

			if (position < 100 && this.playing)
				this.video.play();
		}
	}

	updateAudioSlider(event) {
		if (event.type == "mouseenter") {
			this.hoveringAudioSlider = true;
			this.audioSlider.classList.add("active");
		} else if (event.type == "mouseleave") {
			this.hoveringAudioSlider = false;

			setTimeout(() => {
				if (!this.draggingAudioSlider && !this.hoveringAudioSlider)
					this.audioSlider.classList.remove("active");
			}, 350);

			if (!this.draggingAudioSlider)
					this.audioSlider.classList.remove("active");
		} else if (event.type == "mousedown") {
			this.draggingAudioSlider = true;
		} else if (event.type == "mouseup" || event.type == "mousemove") {
			if (this.draggingAudioSlider) {
				const position = Math.round(100 - (event.clientY - this.audioSlider.getBoundingClientRect().top) / this.audioSlider.offsetWidth * 100);
				this.setVolume(position);
			}

			if (this.audio && !this.hoveringAudioSlider && event.type == "mouseup")
				this.audioSlider.classList.remove("active");
		}
	}

	onMouseMove(event) {
		if (this.draggingVideoProgress || this.draggingAudioSlider)
			event.preventDefault();

		this.updateVideoProgress(event);
		this.updateAudioSlider(event);

		this.toggleControls(event);
	}

	onMouseUp(event) {
		this.updateVideoProgress(event);
		this.updateAudioSlider(event);

		this.draggingVideoProgress = false;
		this.draggingAudioSlider = false;
	}

	onScroll(event) {
		this.visible = isVisible(this.video);

		if (this.started) {
			if (this.visible && !this.playing && !this.manuallyPaused) {
				this.video.play();
				console.log("playing");
			} else if (!this.visible && this.playing && !this.manuallyPaused) {
				this.video.pause();
				console.log("pausing");
			}
		}
	}

	/**
	 * Controls should only disappear if the mouse has left the video element hasn't dragged the audio or video slider for at least 350ms
	 * @param {*} event 
	 */
	toggleControls(event) {
		if (event.type == "mouseenter") {
			this.hoveringVideo = true;
			this.videoControls.classList.add("hover");
		} else if (event.type == "mouseleave") {
			this.hoveringVideo = false;
		} else if (event.type == "mousemove") {
			if (!this.hoveringVideo) {
				if (this.videoControlsHoverExitTimeout == null) 
					this.videoControlsHoverExitTimeout = setTimeout(() => {
						if (!this.hoveringVideo && !this.draggingVideoProgress && !this.draggingAudioSlider)
							this.videoControls.classList.remove("hover");
					}, 350);
			} else if (this.videoControlsHoverExitTimeout != null) {
				clearTimeout(this.videoControlsHoverExitTimeout);
				this.videoControlsHoverExitTimeout = null;
			}
		}
	}
}

function addVideoControls(post) {
	// Set up video
	const video = post.querySelector("video.post-media");

	if (video != null)
		new videoControls(video);
}

//#endregion

//#region FEED

/**
 * Updates the list of posts
 */
function updateFeed() {
	if (!arraysEqual(currentFeed.subreddits, currentSubreddits) || currentFeed.filterIndex != currentFilterIndex) {
		if (getCurrentDirectory()[0] == "") {
			renderPosts();
		} else if (getCurrentDirectory()[0] == "search") {
			renderSearchResults();
		}
	}
}

/**
 * Saves the current feed to local storage
 */
function saveCurrentFeed() {
	localStorage.setItem("currentFeed", JSON.stringify(currentFeed));
}

/**
 * Loads the current feed from local storage
 * @returns {boolean} False if there was no saved feed
 */
function loadCurrentFeed() {
	const feed = JSON.parse(localStorage.getItem("currentFeed"));

	if (feed != null) {
		currentFeed = feed;
		currentSubreddits = currentFeed.subreddits.slice();
		currentFilterIndex = currentFeed.filterIndex;

		return true;
	} else {
		return false;
	}
}

/**
 * Updates list that displayes the subreddits of the current feed
 */
async function updateSubredditList() {
	let oldSubreddits = [];
	Array.from(subredditList.children).forEach(child => {
		oldSubreddits.push(child.textContent.trim().replace("r/", ""));
	});

	// Add missing subreddits
	for (let i = 0; i < currentSubreddits.length; i++)
		if (!oldSubreddits.includes(currentSubreddits[i]))
			subredditList.innerHTML += `<li>${await getSubredditIcon(currentSubreddits[i])} r/${currentSubreddits[i]} <button class="subreddit-toggle-button button" onclick="toggleSubreddit('${currentSubreddits[i]}')"></button></li>`;

	// Remove subreddits
	for (let i = 0; i < subredditList.children.length; i++)
		if (!currentSubreddits.includes(subredditList.children[i].textContent.trim().replace("r/", ""))) {
			subredditList.removeChild(subredditList.children[i]);
			i--; // Index decreases becaues child is removed
		}

	if (!currentSubreddits.length)
		subredditList.textContent = null;

	updateSubredditButtons();
}

/**
 * Updates all toggle subreddit buttons
 */
function updateSubredditButtons() {
	document.querySelectorAll(".subreddit-toggle-button").forEach(button => {
		if (currentSubreddits.includes(button.getAttribute("onclick").replace("toggleSubreddit('", "").replace("')", ""))) {
			button.classList.add("active");
		} else if (button.classList.contains("active")) {
			button.classList.remove("active");
		}
	});
}

/**
 * Enables to custom feed list to let the user load a new feed
 */
function showCustomFeedList() {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : null;

	if (customFeeds) {
		customFeedsList.classList.add("active");

		customFeedsList.children[0].innerHTML = Object.keys(customFeeds).map(key => 
			`<li>${key} (${customFeeds[key].subreddits.length})<button class="feed-load-button button" onclick="loadFeed('${key}')"></li>`
		).join("");
	}
}

/**
 * Add/remove a subreddit from the current feed
 * @param {string} subreddit - Name of the new subreddit
 */
function toggleSubreddit(subreddit) {
	if (currentSubreddits.includes(subreddit)) {
		currentSubreddits.splice(currentSubreddits.indexOf(subreddit), 1); // Remove subreddit from list of current subreddits
	} else {
		currentSubreddits.push(subreddit);
	}

	updateSubredditList();
	updateFeed();
}

/**
 * Changes the current filter and updates the list of posts
 * @param {number} index - Index of the new filter
 * @param {boolean} - If set to true, it's possibel to select no filter
 */
function toggleFilter(index, allowNone) {
	// Should return if the user presses the current filter button

	let none = true;
	for (let i = 0; i < filterList.children.length; i++) {
		const filterButton = filterList.children[i];
		const isActive = filterButton.classList.contains("active");
		const isClicked = i == index;

		if (isClicked && isActive && !allowNone)
			return;

		if ((!isClicked && isActive) || (isClicked && isActive && allowNone)) {
			filterButton.classList.remove("active");
		} else if (isClicked) {
			filterButton.classList.add("active");
			none = false;
		}
	}

	currentFilterIndex = !none ? index : null;
	if (getCurrentDirectory()[0] == "search")
		localStorage.setItem("searchFilter", currentFilterIndex);
	updateFeed();
}

/**
 * Saves a custom feed
 */
function saveFeed() {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : {};
	customFeeds[feedName.value] = currentFeed;

	localStorage.setItem("customFeeds", JSON.stringify(customFeeds));
	hideFeedName();
}

/**
 * Load a custom feed
 * @param {string} name - Name of the custom feed to load
 */
function loadFeed(name) {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : null;

	if (!name || !customFeeds || !customFeeds[name])
		return;

	currentSubreddits = customFeeds[name].subreddits;
	currentFilterIndex = customFeeds[name].filterIndex;

	// Update the list of posts and the list filters
	toggleFilter(currentFilterIndex);
	updateSubredditList();
}

//#endregion

//#region SCROLLING

document.addEventListener("scroll", function(event) {
	const lastPost = getCurrentDirectory()[0] != "search" ? document.querySelector("#posts-list .post:last-child") : document.querySelector("#results-list .post:last-child");
	if (lastPost) {
		const lastPostTop = lastPost.getBoundingClientRect().top;
		const screenBottom = window.innerHeight;

		// Check if the last post is visible
		if (screenBottom > lastPostTop && !loadingNewPosts) {
			if ( getCurrentDirectory()[0] != "search") {
				renderPosts();
			} else {
				renderSearchResults();
			}
			
			loadingNewPosts = true;
		}
	}

	if (window.scrollY > 500) {
		scrollUp.classList.add("active");
	} else if (scrollUp.classList.contains("active")) {
		scrollUp.classList.remove("active");
	}
});

function scrollToTop() {
	window.scroll({
		top: 0, 
		behavior: "smooth",
	});
}

/**
 * Checks if an element is currently visible by comparing the top and bottom of the rect to the top and bottom of the window
 * @param {*} element
 * @returns True if the element is visible
 */
function isVisible(element) {
	const top = element.getBoundingClientRect().top;
	const bottom = element.getBoundingClientRect().bottom;

	if (window.innerHeight > top && bottom > 0) {
		return true;
	} else {
		return false;
	}
}

//#endregion

//#region SEARCHING

/**
 * Search for a subreddit name and update search results
 * @param {string} name - Name of the subreddit to search for
 */
 async function searchSubreddit(name) {
	let searchButton = searchResultList.querySelector("#search-button");
	const searchText = `<span><i class="fas fa-search" aria-hidden="true"></i>Search for "${name}"</span><i class="button fa-solid fa-angle-right"></i>`;
	const searchUrl = `search/?q=${name}`;

	if (!name) {
		searchResultList.innerHTML = "";
		searchResultList.style.display = "none";
	} else {
		if (searchButton) {
			searchButton.innerHTML = searchText;
			searchButton.href = searchUrl;
		} else if (name) {
			searchResultList.innerHTML += `<a id="search-button" href="${searchUrl}">${searchText}</a>`;
			searchButton = searchResultList.querySelector("#search-button");
		}

		await fetch(`https://www.reddit.com/subreddits/search.json?q=${name}${allowSensitiveContent ? "&include_over_18=1" : ""}&sort=relevance`).then(function(result) {
			return result.json();
		}).then(function(result) {			
			if (searchInput.value != name)
				return searchResultList.style.display = "none";

			const searchResults = result.data.children.slice(0, 10);

			const div = document.createElement("div");
			div.appendChild(searchButton);

			searchResultList.innerHTML = searchResults.map(element => 
				`<p class="search-result">${element.data.display_name_prefixed}<button class="subreddit-toggle-button button" onclick="toggleSubreddit('${element.data.display_name}')"></button></p>`
			).join("") + renderHTML(div.innerHTML);
		});

		searchResultList.style.display = null;
	}

	updateSubredditButtons();
}

//#endregion

//#region SIDE MENU

/**
 * Used on mobile to toggle a menu overlay
 */
 function toggleSideMenu() {
	if (!sideMenu.classList.contains("active")) {
		sideMenu.classList.add("active");

		postsList.style.filter = "blur(5px)";
		postsList.style.pointerEvents = "none";
		document.body.style.overflow = "hidden";
	} else {
		sideMenu.classList.remove("active");

		postsList.style.filter = null;
		postsList.style.pointerEvents = null;
		document.body.style.overflow = null;
	}
}

/**
 * Enables input field for custom feed name
 */
function showFeedName() {
	feedName.classList.add("active");
	feedName.disabled = false;
	feedName.focus();
	feedName.select();
}

/**
 * Disables input field for custom feed name
 */
function hideFeedName() {
	feedName.classList.remove("active");
	feedName.disabled = true;
}

//#endregion

//#region OPTIONS

function toggleSensitiveContent() {
	localStorage.setItem("allowSensitiveContent", !hideSensitiveContentToggle.checked);
	allowSensitiveContent = !hideSensitiveContentToggle.checked;
	renderPosts(true);
}

//#endregion