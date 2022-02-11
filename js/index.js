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
const postsList = document.querySelector("#posts-list");
const filterList = document.querySelector("#filter-list");
const subredditList = document.querySelector("#subreddits-list ul");
const searchResultList = document.querySelector("#search-results");
const customFeedsList = document.querySelector("#feeds-list");

// Input elements
const searchInput = document.querySelector("#search-bar input");
const hideSensitiveContentToggle = document.querySelector("#sensitive-content");

const sideMenu = document.querySelector("#side-menu");
const pageContent = document.querySelector("#page-content");
const header = document.querySelector("header");
const feedName = document.querySelector("#feed-name");
const subredditOptions = document.querySelector("#subreddit-options");
const postViewer = document.querySelector("#post-viewer");
const scrollUp = document.querySelector("#scroll-up");
const videoControls = document.getElementById("video-controls");

// Meta settings
let feedId = 0;
const maxPosts = 10;
let postCount = 0;
let lastPost;
let loadingNewPosts = false;
let allowSensitiveContent = false;

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

// Parameters
let parameters = window.location.search != "" ? window.location.search.substring(1).split("&") : null;

if (parameters)
	for (let i = 0; i < parameters.length; i++)
		if (parameters[i].startsWith("post=")) {
			showPostViewer(parameters[i].replace("post=", ""));
			break;
		}

// OAuth
const code = (parameters && parameters[0] == "state=connect") ? parameters[1].replace("code=", "") : null;

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
	if (post.media) {
		if (post.media.reddit_video) {
			const source = post.media.reddit_video.fallback_url.substring(0, post.media.reddit_video.fallback_url.length - 16);

			// Fetch audio
			const audioSource = source.replace(new RegExp("DASH_[0-9]+.mp4"), "DASH_audio.mp4");
			const audioResponse = await fetch(audioSource);
			let audio = "";

			if (audioResponse.status == 200)
				audio = `<audio preload="auto" controls loop>
					<source src=\"${audioSource}" type="audio/mp4">
				</audio>`;

			media = `<video class="${classes.length ? classes.join(" ") : classes[0]}" preload="auto" controls loop>
				<source src=\"${source}" type="video/mp4">
				${audio}
			</video>`;
		} else if (post.media.oembed) {
			media = `<img class="${classes.length ? classes.join(" ") : classes[0]}" src="${post.media.oembed.thumbnail_url}" loading="lazy">`;
		}
	} else if (post.preview) {
		if (post.preview.images[0].variants.gif) {
			media = `<img class="${classes.length ? classes.join(" ") : classes[0]}" src="${post.preview.images[0].variants.gif.source.url.replace("&amp;", "&")}" loading="lazy">`;
		} else {
			media = `<img class="${classes.length ? classes.join(" ") : classes[0]}" src="${post.preview.images[0].source.url.replace("&amp;", "&")}" loading="lazy">`;
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

	// Get user icon
	let icon = `https://www.redditstatic.com/avatars/defaults/v2/avatar_default_${Math.floor(Math.random() * 7)}.png`;
	if (comment.data.author != "[deleted]")
		icon = await fetch(`https://www.reddit.com/user/${comment.data.author}/about.json`).then((result) => result.json()).then(result => {
			return result.data.icon_img;
		});
	
	let thread = `<span class="comment" style="margin-left: ${comment.data.depth * 25}px;">
		<p class="comment-header"><img src="${icon}" loading="lazy"> ${comment.data.author} &middot; ${getTimePassedSinceDate(comment.data.created)} ago</p>
		${comment.data.body_html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(new RegExp("<!-- [A-z]* -->"), "").replace("<div class=\"md\">", "<div class=\"comment-body\">")}
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
	let subredditIcon = "<img class=\"subreddit-icon\" src=\"media/logo.png\">";
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

//#endregion

//#region SET

function setURLParameter(key, value) {
	let url = location.protocol + '//' + location.host + location.pathname;
	parameters = window.location.search != "" ? window.location.search.substring(1).split("&") : null;

	index = null;
	let setURL = false;
	if (parameters != null) {
		for (let i = 0; i < parameters.length; i++)
			if (parameters[i].startsWith(`${key}=`))
				index = i;
	} else if (value != null) {
		url += `?${key}=${value}`;
		setURL = true;
	}

	if (!setURL)
		if (index == null && value != null) {
			url += window.location.search + `&${key}=${value}`;
		} else if (index != null && value == null) {
			parameters.splice(index, 1);
			if (parameters.length > 0)
				url += `?${parameters.length > 1 ? parameters.join("&") : parameters[0]}`;
		} else if (index != null) {
			parameters[index] = parameters[index].replace(new RegExp(`${key}=[A-z0-9]*`), `${key}=${value}`);
			url += `?${parameters.length > 1 ? parameters.join("&") : parameters[0]}`;
		}

	window.history.pushState({ path: url }, "", url);
}

//#endregion

//#region SET UP

function setUpPage() {
	// Set element properties
	feedName.disabled = true;
	hideSensitiveContentToggle.checked = localStorage.getItem("allowSensitiveContent") == "true" ? false : true;
	allowSensitiveContent = !hideSensitiveContentToggle.checked;

	// Set up feed
	if (loadCurrentFeed()) {
		setFilter(currentFilterIndex);
	} else {
		setFilter(1);
	}

	updateSubredditList();
	renderPosts();

	// Set up input events
	getSubreddit();
	searchInput.addEventListener("input", function (event) {
		getSubreddit(event.target.value);
	});

	window.addEventListener("keydown", function(event) {
		if (event.code == "Enter" && feedName.classList.contains("active"))
			saveFeed();
	});

	// Set up click events
	document.addEventListener("mousedown", event => {
		let element = event.target;

		if (!header.contains(element) || element.id == "side-menu-toggle")
			getSubreddit();

		if (!sideMenu.firstChild.nextSibling.contains(element) && element.id != "side-menu-toggle" && sideMenu.classList.contains("active"))
			toggleSideMenu();

		if (!subredditOptions.contains(element) && feedName.classList.contains("active"))
			hideFeedName();

		if (!subredditOptions.contains(element) && !customFeedsList.contains(element) && customFeedsList.classList.contains("active"))
			customFeedsList.classList.remove("active");

		if (!postViewer.firstChild?.contains(element) && postViewer.classList.contains("active")) {
			hidePostViewer();
		} else if (!element.classList.contains("blur") && postsList.contains(element) && element.nodeName != "VIDEO" && element.closest(".post") && !element.closest(".post").querySelector(".post-media-container .post-media-inner-container").contains(element)) {
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

	// Set up search
	document.querySelector("#search-bar").addEventListener("click", function (event) {
		getSubreddit(searchInput.value);
	});
}

setUpPage();

//#endregion

//#region POSTS

/**
 * Adds a single post to the list of posts
 * @param {string} html - A post in html format
 */
async function addPost(html) {
	const div = document.createElement("div");
	div.innerHTML = html;

	const post = postsList.appendChild(div.firstChild);

	// Set up video
	const video = post.querySelector("video.post-media");
	if (video != null) {
		video.controls = false;

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

		video.parentElement.appendChild(controlsDiv.firstChild);

		const audio = video.querySelector("audio");
		const audioSlider = video.parentElement.querySelector(".secondary-video-controls #volume .slider");
		const videoProgress = video.parentElement.querySelector(".secondary-video-controls #progress");

		if (!audio) {
			video.parentElement.classList.add("muted");
			audioSlider.style.display = "none";
			audioSlider.parentElement.style.cursor = "auto";
			audioSlider.parentElement.style.color = "inherit";
		} else {
			audioSlider.value = 100;
			audioSlider.style.setProperty("--volume", 100);
		}

		let playing = false;
		let muted = false;
		let volume = audioSlider.value;

		let draggingVideoProgress = false;
		let draggingAudioSlider = false;

		let hoveringAudioSlider = false;

		video.parentElement.querySelector(".primary-video-controls").addEventListener("click", async function(event) {
			event.target.closest(".video-controls").classList.add("active");

			let progressUpdateInterval = null;

			video.onplay = function() {
				if (audio) {
					audio.currentTime = video.currentTime;
					audio.play();
				}

				video.play();

				// Keep audio in sync
				if (audio)
					setInterval(() => {
						if (Math.abs(video.currentTime - audio.currentTime) > 0.2)
							audio.currentTime = video.currentTime;
					}, 100);

				playing = true;
				video.parentElement.classList.remove("paused");

				progressUpdateInterval = setInterval(() => {
					videoProgress.style.setProperty("--progress", (video.currentTime / video.duration) * 100);
				}, 0);
			}
			video.onpause = function() {
				if (audio)
					audio.pause();

				if (!draggingVideoProgress)
					playing = false;
				video.parentElement.classList.add("paused");

				clearInterval(progressUpdateInterval);
			}

			video.play();
		});

		video.parentElement.querySelector(".secondary-video-controls #pause").addEventListener("click", function(event) {
			if (playing) {
				video.pause();
			} else {
				video.play();
			}
		})

		video.parentElement.querySelector(".secondary-video-controls #volume").addEventListener("click", function(event) {
			if (!event.target.classList.contains("slider") && audio) {
				muted = !muted;

				if (muted) {
					video.parentElement.classList.add("muted");
				} else {
					video.parentElement.classList.remove("muted");
				}

				audio.volume = muted ? 0 : volume / 100;
				audioSlider.value = muted ? 0 : volume;
			}
		});

		videoProgress.addEventListener("mousedown", function(event) {
			draggingVideoProgress = true;
			setTimeout(() => {
				if (draggingVideoProgress)
					video.pause();
			}, 100);
		});

		audioSlider.addEventListener("mousedown", function(event) {
			draggingAudioSlider = true;
		});

		document.addEventListener("mousemove", function(event) {
			if (draggingVideoProgress || draggingAudioSlider)
				event.preventDefault();

			if (draggingVideoProgress) {
				const position = Math.round((event.clientX - videoProgress.getBoundingClientRect().left) / videoProgress.offsetWidth * 100);

				videoProgress.style.setProperty("--progress", position);
				video.currentTime = position / 100 * video.duration;

				if (audio)
					audio.currentTime = video.currentTime;
			}

			if (draggingAudioSlider) {
				const position = Math.round(100 - (event.clientY - audioSlider.getBoundingClientRect().top) / audioSlider.offsetWidth * 100);

				volume = Math.min(Math.max(position, 0), 100);
				audio.volume = volume / 100;
				audioSlider.style.setProperty("--volume", volume);

				if (volume > 0) {
					video.parentElement.classList.remove("muted");
					muted = false;
				} else {
					video.parentElement.classList.add("muted");
					muted = true;
				}
			}
		});

		document.addEventListener("mouseup", function(event) {
			if (draggingVideoProgress) {
				const position = Math.round((event.clientX - videoProgress.getBoundingClientRect().left) / videoProgress.offsetWidth * 100);

				videoProgress.style.setProperty("--progress", position);
				video.currentTime = position / 100 * video.duration;
	
				if (audio)
					audio.currentTime = video.currentTime;
	
				if (position < 100 && playing)
					video.play();
			}

			if (draggingAudioSlider) {
				const position = Math.round(100 - (event.clientY - audioSlider.getBoundingClientRect().top) / audioSlider.offsetWidth * 100);

				volume = Math.min(Math.max(position, 0), 100);;
				audio.volume = volume / 100;
				audioSlider.style.setProperty("--volume", volume);

				if (volume > 0) {
					video.parentElement.classList.remove("muted");
					muted = false;
				} else {
					video.parentElement.classList.add("muted");
					muted = true;
				}
			}

			if (audio && !hoveringAudioSlider)
				audioSlider.classList.remove("active");

			draggingVideoProgress = false;
			draggingAudioSlider = false;
		});

		if (audio) {
			audioSlider.parentElement.addEventListener("mouseenter", function(event) {
				hoveringAudioSlider = true;
				audioSlider.classList.add("active");
			});
	
			audioSlider.parentElement.addEventListener("mouseleave", function(event) {
				hoveringAudioSlider = false;
				setTimeout(() => {
					if (!draggingAudioSlider && !hoveringAudioSlider)
						audioSlider.classList.remove("active");
				}, 350);
			});

			audioSlider.parentElement.addEventListener("mouseleave", function(event) {
				if (!draggingAudioSlider)
					audioSlider.classList.remove("active");
			});
		}
	}
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
	const description = post.selftext_html ? post.selftext_html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&").replace(new RegExp("<!-- [A-z]* -->"), "").replace("<div class=\"md\">", "<div class=\"post-description\">") : "";
	const id = post.id;

	const upvotesCount = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
	const commentsCount = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
	const crosspostsCount = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

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
				<p class="post-header">${await getSubredditIcon(post.subreddit)}${subRedditName} &middot; Posted by u/${author} ${getTimePassedSinceDate(post.created)} ago ${tags.length ? `<span class="tags">${tags.join("")}</span>` : ""}</p>
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

		lastPost = null;

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

	const url = `https://www.reddit.com/r/${currentSubreddits.length > 1 ? currentSubreddits.join("+") : currentSubreddits[0]}/${filters[currentFilterIndex]}.json?limit=${maxPosts}${lastPost ? "&after=" + lastPost : ""}`;

	fetch(url).then(function(result) {
			return result.json();
		}).then(async function(result) {
			const posts = result.data.children;

			if (!posts.length)
				addPost("<p>There doesn't seem to be anything here.</p>");

			let skipped = 0;
			for (let i = 0; i < posts.length; i++) {
				const post = posts[i].data;

				console.log(post);

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

				postCount++;
				lastPost = "t3_" + post.id;
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

//#region FEED

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
 * Updates the list of posts
 */
function updateFeed() {
	if (!arraysEqual(currentFeed.subreddits, currentSubreddits) || currentFeed.filterIndex != currentFilterIndex)
		renderPosts();
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
 * Changes the current filter and updates the list of posts
 * @param {number} index - Index of the new filter
 */
 function setFilter(index) {
	// Should return if the user presses the current filter button

	for (let i = 0; i < filterList.children.length; i++) {
		if (i == index) {
			filterList.children[i].classList.add("active");
		} else if (filterList.children[i].classList.contains("active")) {
			filterList.children[i].classList.remove("active");
		}
	}

	currentFilterIndex = index;
	updateFeed();
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
	setFilter(currentFilterIndex);
	updateSubredditList();
}

//#endregion

//#region SCROLLING

document.addEventListener("scroll", function(event) {
	const lastPostTop = document.querySelector("#posts-list > div:last-child").getBoundingClientRect().top;
	const screenBottom = window.innerHeight;

	// Check if the last post is visible
	if (screenBottom > lastPostTop && !loadingNewPosts) {
		renderPosts();
		loadingNewPosts = true;
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

//#endregion

//#region SEARCHING

/**
 * Search for a subreddit name and update search results
 * @param {string} name - Name of the subreddit to search for
 */
 async function getSubreddit(name) {
	const searchUrl = `https://www.reddit.com/subreddits/search.json?q=${name}`;

	if (!name) {
		searchResultList.innerHTML = "";
		searchResultList.style.display = "none";
	} else {
		await fetch(searchUrl).then(function(result) {
			return result.json();
		}).then(function(result) {			
			if (searchInput.value != name)
				return searchResultList.style.display = "none";

			const searchResults = result.data.children.slice(0, 15);

			searchResultList.innerHTML = searchResults.map(element => 
				`<p class="search-result">${element.data.display_name_prefixed}<button class="subreddit-toggle-button button" onclick="toggleSubreddit('${element.data.display_name}')"></button></p>`
			).join("");
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