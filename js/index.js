/**
 * Uses the Reddit API to fetch data from reddit.com
 * Documentation: https://www.reddit.com/dev/api/
 * 
 * Made by Prozilla
 */



//#region VARIABLES

// Feed settings
let currentSubreddits = [
	"all",
];

let currentFilterIndex;
const filters = [
	"best",
	"hot",
	"new",
	"top",
	"rising",
];

let currentFeed = {
	subreddits: null,
	filterIndex: null,
};

// Element references
let postsList;
let filterList;
let subredditList;
let searchInput
let searchResultList;
let sideMenu;
let pageContent;
let header;
let feedName;
let subredditOptions;
let customFeedsList;
let postViewer;

// Meta settings
let url;
let feedId = 0;

//#endregion



//#region RETURNING FUNCTIONS

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

	let media;
	if (post.media) {
		if (post.media.reddit_video) {
			const source = post.media.reddit_video.fallback_url.substring(0, post.media.reddit_video.fallback_url.length - 16);

			// Fetch audio
			const audioSource = source.replace(new RegExp("DASH_[0-9]+.mp4"), "DASH_audio.mp4");
			const audioResponse = await fetch(audioSource);
			let audio = "";
			if (audioResponse.status == 200)
				audio = `<audio controls>
					<source src=\"${audioSource}" type="audio/mp4">
				</audio>`;

			media = `<video class="post-media" controls>
				<source src=\"${source}" type="video/mp4">
				${audio}
			</video>`;
		} else if (post.media.oembed) {
			media = `<img class="post-media" src="${post.media.oembed.thumbnail_url}" loading="lazy">`;
		}
	} else if (post.preview) {
		if (post.preview.images[0].variants.gif) {
			media = `<img class="post-media" src="${post.preview.images[0].variants.gif.source.url.replace("&amp;", "&")}" loading="lazy">`;
		} else {
			media = `<img class="post-media" src="${post.preview.images[0].source.url.replace("&amp;", "&")}" loading="lazy">`;
		}
	}

	return media ? media : "";
}

/**
 * Adds a single post to the list of posts
 * @param {string} html - A post in html format
 */
function addPost(html) {
	const div = document.createElement("div");
	div.innerHTML = html;

	postsList.appendChild(div.firstChild);

	postsList.querySelectorAll("video.post-media").forEach(video => {
		const audio = video.querySelector("audio");
		video.onplay = function() {
			audio.play();
		}
		video.onpause = function() {
			audio.pause();
		}
	});
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
		currentSubreddits = currentFeed.subreddits;
		currentFilterIndex = currentFeed.filterIndex;

		return true;
	} else {
		return false;
	}
}

/**
 * Renders a recursively comment in html format
 * @param {Object} comment - The comment on top of the thread that needs to be rendered
 * @returns {string} Comment and its replies in html format
 */
 async function renderComment(comment) {
	const replies = comment.data.replies ? Array.from(comment.data.replies.data.children) : null;
	if (comment.kind == "more") {
		// Do somethig
	}

	// Get user icon
	const icon = await fetch(`https://www.reddit.com/user/${comment.data.author}/about.json`).then((result) => result.json()).then(result => {
		return result.data.icon_img;
	});
	
	let thread = `<span class="comment" style="margin-left: ${comment.data.depth * 25}px;">
		<p class="comment-header"><img src="${icon}" loading="lazy"> ${comment.data.author} &middot; ${getTimePassedSinceDate(comment.data.created)} ago</p>
		<p class="comment-body">${comment.data.body}</p>
	</span>`;

	// Render replies recursively
	if (replies) {
		for (let i = 0; i < replies.length; i++)
			replies[i] = await renderComment(replies[i]);

		thread += replies.join("");
	}

	return thread;
}

//#endregion



//#region EVENTS

$(document).ready(function () {
	// Get elements
	postsList = document.querySelector("#posts-list");
	filterList = document.querySelector("#filter-list");
	subredditList = document.querySelector("#subreddits-list ul");
	searchInput = document.querySelector("#search-bar input");
	searchResultList = document.querySelector("#search-results");
	sideMenu = document.querySelector("#side-menu");
	pageContent = document.querySelector("#page-content");
	header = document.querySelector("header");
	feedName = document.querySelector("#feed-name");
	subredditOptions = document.querySelector("#subreddit-options");
	customFeedsList = document.querySelector("#feeds-list");
	postViewer = document.querySelector("#post-viewer");

	feedName.disabled = true;

	// Set up feed
	if (loadCurrentFeed()) {
		setFilter(currentFilterIndex);
	} else {
		setFilter(1);
	}
	updateSubredditList();

	// Set up input events
	getSubreddit();
	searchInput.addEventListener("input", function (event) {
		getSubreddit(event.target.value);
	});

	$(document).keypress(function(event) {
		if (event.which == 13 && feedName.classList.contains("active"))
			saveFeed();
	});

	// Set up click events
	document.addEventListener("click", event => {
		if (!header.contains(event.target) || event.target.id == "side-menu-toggle")
			getSubreddit();

		if (!sideMenu.contains(event.target) && event.target.id != "side-menu-toggle" && sideMenu.classList.contains("active"))
			toggleSideMenu();

		if (!subredditOptions.contains(event.target) && feedName.classList.contains("active"))
			hideFeedName();

		if (!subredditOptions.contains(event.target) && !customFeedsList.contains(event.target) && customFeedsList.classList.contains("active"))
			customFeedsList.classList.remove("active");

		if (!postViewer.firstChild?.contains(event.target) && postViewer.classList.contains("active")) {
			hidePostViewer();
		} else if (postsList.contains(event.target) && event.target.nodeName != "VIDEO") {
			let element = event.target;
			while(element && !$(element).attr("data-post-id") && typeof $(element).attr("data-post-id") == "undefined")
				element = element.parentNode;

			if (element)
				showPostViewer(element.getAttribute("data-post-id"));
		} 
	});

	// Set up search
	document.querySelector("#search-bar").addEventListener("click", function (event) {
		getSubreddit(searchInput.value);
	});
});

//#endregion



//#region UPDATING UI

/**
 * Render posts of the curren feed and update the list of posts
 */
function renderPosts() {
	const proxy = "https://cors-anywhere.herokuapp.com/";
	url = `https://www.reddit.com/r/${currentSubreddits.length > 1 ? currentSubreddits.join("+") : currentSubreddits[0]}/${filters[currentFilterIndex]}.json`;

	currentFeed.subreddits = currentSubreddits;
	currentFeed.filterIndex = currentFilterIndex;

	saveCurrentFeed();

	// Remove old posts
	if (postsList.children.length > 1) {
		const oldPosts = Array.from(postsList.children);
		oldPosts.splice(0, 1);

		oldPosts.forEach(child => {
			postsList.removeChild(child);
		});
	}

	if (!currentSubreddits.length)
		return addPost("<p class=\"empty-feed-warning\">There doesn't seem to be anything here.</p>");

	feedId++;

	fetch(url).then(function(result) {
			return result.json();
		}).then(async function(result) {
			const posts = result.data.children;

			if (!posts.length) {
				addPost("<p>There doesn't seem to be anything here.</p>");
			}

			for (let i = 0; i < posts.length; i++) {
				const post = posts[i].data;

				console.log(post);

				let subredditIcon;
				await fetch(`https://www.reddit.com/r/${post.subreddit}/about.json`).then(function(res) {
					return res.json();
				}).then(function(res) {
					subredditIcon = `<img class="post-subreddit-icon" src="${res.data.icon_img ? res.data.icon_img : res.data.community_icon}" loading="lazy">`;
				});

				const subRedditName = post.subreddit_name_prefixed;
				const author = "u/" + post.author;
				const title = post.title;
				const description = `<p class="post-description">${post.selftext}</p>`;
				const id = post.id;

				const upvotes = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
				const comments = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
				const crossposts = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

				if (post.over_18)
					continue;

				if (postsList.children[i] == null || (postsList.children[i].id != "filter-list" && postsList.children[i].getAttribute("data-feed-id") != feedId))
					break;

				addPost(`<div data-feed-id="${feedId}" data-post-id="${id}" class="post box">
					<p class="post-header">${subredditIcon}${subRedditName} &middot; Posted by ${author} ${getTimePassedSinceDate(post.created)} ago</p>
					<p class="post-title">${title}</p>
					${description}
					${await renderPostMedia(post)}
					<span class="post-footer"><p><i class="far fa-heart"></i>${upvotes}</p><p><i class="far fa-comment"></i>${comments}</p><p><i class="fas fa-random"></i>${crossposts}</p></span>
				</div>`);
			}
		}).catch(function(error) {
			console.log(error);
		});
}

/**
 * Enables the post viewer and renders the selected post
 * @param {number} id - Id of the post that needs to be rendered
 */
 function showPostViewer(id) {
	postViewer.setAttribute("data-post-id", id);

	// Load post (has to be made into a seperate function)
	fetch(`https://www.reddit.com/comments/${id}/.json`).then(function(result) {
		return result.json();
	}).then(async function(result) {
		const post = result[0].data.children[0].data;
		const threads = result[1].data.children;

		let subredditIcon;
		await fetch(`https://www.reddit.com/r/${post.subreddit}/about.json`).then(function(res) {
			return res.json();
		}).then(function(res) {
			subredditIcon = `<img class="post-subreddit-icon" src="${res.data.icon_img ? res.data.icon_img : res.data.community_icon}" loading="lazy">`;
		});

		const subRedditName = post.subreddit_name_prefixed;
		const author = "u/" + post.author;
		const title = post.title;
		const description = `<p class="post-description">${post.selftext}</p>`;
		const id = post.id;

		const upvotes = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
		const comments = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
		const crossposts = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

		postViewer.innerHTML = `<div class="post box">
			<p class="post-header">${subredditIcon}${subRedditName} &middot; Posted by ${author} ${getTimePassedSinceDate(post.created)} ago</p>
			<p class="post-title">${title}</p>
			${description}
			${await renderPostMedia(post)}
			<span class="post-footer"><p><i class="far fa-heart"></i>${upvotes}</p><p><i class="far fa-comment"></i>${comments}</p><p><i class="fas fa-random"></i>${crossposts}</p></span>
			<p id="loading-comments">Loading comments...</p>
		</div>`;

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

	// Show post viewer
	postViewer.classList.add("active");

	postsList.style.filter = "blur(5px)";
	postsList.style.pointerEvents = "none";

	sideMenu.style.filter = "blur(5px)";
	sideMenu.style.pointerEvents = "none";

	document.body.style.overflow = "hidden";
}

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

/**
 * Enables to custom feed list to let the user load a new feed
 */
function showCustomFeedList() {
	const customFeeds = localStorage.getItem("customFeeds") ? JSON.parse(localStorage.getItem("customFeeds")) : null;

	if (customFeeds) {
		customFeedsList.classList.add("active");

		console.log(customFeeds["test"]);

		customFeedsList.children[0].innerHTML = Object.keys(customFeeds).map(key => 
			`<li>${key} (${customFeeds[key].subreddits.length})<button class="feed-load-button button" onclick="loadFeed('${key}')"></li>`
		).join("");
	}
}

/**
 * Disables the post viewer
 */
function hidePostViewer() {
	postViewer.classList.remove("active");

	postsList.style.filter = null;
	postsList.style.pointerEvents = null;

	sideMenu.style.filter = null;
	sideMenu.style.pointerEvents = null;

	document.body.style.overflow = null;
}

//#endregion



//#region UPDATE

/**
 * Updates list that displayes the subreddits of the current feed
 */
 async function updateSubredditList() {
	const oldSubreddits = []
	Array.from(subredditList.children).forEach(child => {
		oldSubreddits.push(child.textContent.trim().replace("r/", ""));
	});

	// Add missing subreddits
	for (let i = 0; i < currentSubreddits.length; i++)
		if (!oldSubreddits.includes(currentSubreddits[i])) {
			// Get icon
			let subredditIcon;
			if (currentSubreddits[i] == "all") {
				subredditIcon = "<img class=\"subreddit-icon\" src=\"media/logo.png\">";
			} else {
				await fetch(`https://www.reddit.com/r/${currentSubreddits[i]}/about.json`).then(function(result) {
					return result.json();
				}).then(function(result) {
					subredditIcon = `<img class="subreddit-icon" src="${result.data.icon_img ? result.data.icon_img : result.data.community_icon}" loading="lazy">`;
				}).catch(function(error) {
					console.log(error);
				});
			}

			subredditList.innerHTML += `<li>${subredditIcon} r/${currentSubreddits[i]} <button class="subreddit-toggle-button button" onclick="toggleSubreddit('${currentSubreddits[i]}')"></button></li>`;
		}

	// Remove subreddits
	for (let i = 0; i < oldSubreddits.length; i++)
		if (!currentSubreddits.includes(oldSubreddits[i]))
			subredditList.removeChild(subredditList.children[i]);

	if (!currentSubreddits.length)
		subredditList.textContent = null;

	updateSubredditButtons();
}

/**
 * Updates the list of posts
 */
function updateFeed() {
	if (currentFeed != {subreddits: currentSubreddits, filterIndex: currentFilterIndex})
		renderPosts();
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



//#region UPDATING FEED

/**
 * Changes the current filter and updates the list of posts
 * @param {number} index - Index of the new filter
 */
function setFilter(index) {
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
		// Remove subreddit from list of current subreddits
		currentSubreddits.splice(currentSubreddits.indexOf(subreddit), 1);
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