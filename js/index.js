// Feed
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

// Meta settings
let url;
let feedId = 0;

function addPost(html) {
	const div = document.createElement("div");
	div.innerHTML = html;

	postsList.appendChild(div.firstChild);
}

function renderPosts() {
	const proxy = "https://cors-anywhere.herokuapp.com/";
	url = `https://www.reddit.com/r/${currentSubreddits.length > 1 ? currentSubreddits.join("+") : currentSubreddits[0]}/${filters[currentFilterIndex]}.json`;

	currentFeed.subreddits = currentSubreddits;
	currentFeed.filterIndex = currentFilterIndex;

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

				//console.log(post);

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

				const upvotes = post.score > 999 ? Math.sign(post.score) * ((Math.abs(post.score) / 1000).toFixed(1)) + "k" : post.score;
				const comments = post.num_comments > 999 ? Math.sign(post.num_comments) * ((Math.abs(post.num_comments) / 1000).toFixed(1)) + "k" : post.num_comments;
				const crossposts = post.num_crossposts > 999 ? Math.sign(post.num_crossposts) * ((Math.abs(post.num_crossposts) / 1000).toFixed(1)) + "k" : post.num_crossposts;

				// Get date
				const postDate = Math.abs((new Date(post.created * 1000).getTime() / 1000).toFixed(0));
				const currentDate = Math.abs((new Date().getTime() / 1000).toFixed(0));

				const timePassed = currentDate - postDate;

				const years = Math.floor(timePassed / 30758400);
				const days = Math.floor(timePassed / 86400);
				const hours = Math.floor(timePassed / 3600) % 24;
				const minutes = Math.floor(timePassed / 60) % 60;
				const seconds = timePassed % 60;

				let date;
				if (years > 0) {
					date = years > 1 ? years + " years" : years + " year";
				} else if (days > 0) {
					date = days > 1 ? days + " days" : days + " day";
				} else if (hours > 0) {
					date = hours > 1 ? hours + " hours" : hours + " hour";
				} else if (minutes > 0) {
					date = minutes > 1 ? minutes + " minutes" : minutes + " minute";
				} else {
					date = seconds > 1 ? seconds + " seconds" : seconds + " second";
				}

				// Get media
				let media;
				if (post.media) {
					if (post.media.reddit_video) {
						media = `<video class="post-media" controls autoplay><source src=\"${post.media.reddit_video.fallback_url.substring(0, post.media.reddit_video.fallback_url.length - 16)}" type="video/mp4"></video>`;
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

				if (post.over_18)
					continue;

				if (postsList.children[i] == null || (postsList.children[i].id != "filter-list" && postsList.children[i].getAttribute("data-feed-id") != feedId))
					break;

				addPost(`<div data-feed-id="${feedId}" class="post box">
					<p class="post-header">${subredditIcon}${subRedditName} &middot; Posted by ${author} ${date} ago</p>
					<p class="post-title">${title}</p>
					${description}
					${media ? media : ""}
					<p class="post-footer">${upvotes} points &middot; ${comments} comments &middot; ${crossposts} crossposts</p>
				</div>`);
			}
		}).catch(function(error) {
			console.log(error);
		});
}

$(document).ready(function () {
	postsList = document.querySelector("#posts-list");
	filterList = document.querySelector("#filter-list");
	subredditList = document.querySelector("#subreddits-list ul");
	searchInput = document.querySelector("#search-bar input");
	searchResultList = document.querySelector("#search-results");

	setFilter(1);
	updateSubredditList();

	getSubreddit();
	searchInput.addEventListener("input", function (event) {
		getSubreddit(event.target.value);
	});

	document.addEventListener("click", event => {
		if (event.target != searchResultList && 
			(!event.target.parentElement || event.target.parentElement != searchResultList) && 
			((!event.target.parentElement.parentElement || event.target.parentElement.parentElement != searchResultList))) 
		{
			getSubreddit();
		}
	});

	document.querySelector("#search-bar").addEventListener("click", function (event) {
		getSubreddit(searchInput.value);
	})
});

function updateFeed() {
	if (currentFeed != {subreddits: currentSubreddits, filterIndex: currentFilterIndex})
		renderPosts();
}

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

			subredditList.innerHTML += `<li>${subredditIcon} r/${currentSubreddits[i]} <button class="subreddit-toggle-button" onclick="toggleSubreddit('${currentSubreddits[i]}')"></button></li>`;
		}

	// Remove subreddits
	for (let i = 0; i < oldSubreddits.length; i++)
		if (!currentSubreddits.includes(oldSubreddits[i]))
			subredditList.removeChild(subredditList.children[i]);

	if (!currentSubreddits.length)
		subredditList.textContent = null;

	updateSubredditButtons();
}

function updateSubredditButtons() {
	document.querySelectorAll(".subreddit-toggle-button").forEach(button => {
		if (currentSubreddits.includes(button.getAttribute("onclick").replace("toggleSubreddit('", "").replace("')", ""))) {
			button.classList.add("active");
		} else if (button.classList.contains("active")) {
			button.classList.remove("active");
		}
	});
}

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
				`<p class="search-result">${element.data.display_name_prefixed}<button class="subreddit-toggle-button" onclick="toggleSubreddit('${element.data.display_name}')"></button></p>`
			).join("");
		});

		searchResultList.style.display = null;
	}

	updateSubredditButtons();
}