//#region VARIABLES

const searchScriptLoaded = true;

let searchQuery;
let lastSearchFilter;
const searchFilters = [
	"sr", // Community
	"link", // Post
	"user", // User
];

//#endregion

function setUpSearch() {
	searchQuery = queries ? queries["q"] : null;
	postsList = document.querySelector("#results-list");

	if (!searchQuery) {
		addPost("<p class=\"empty-feed-warning\">There doesn't seem to be anything here.</p>", currentFeedId);
	} else {
		searchInput.value = searchQuery;
	}

	currentFilterIndex = localStorage.getItem("searchFilter");
	toggleFilter(currentFilterIndex);
}

async function renderSearchResults(forceOverwrite) {
	if (lastSearchFilter != currentFilterIndex || forceOverwrite || !searchQuery) {
		lastSearchFilter = currentFilterIndex;
		lastPostId = null;

		// Remove old posts
		if (postsList.children.length > 1) {
			const oldPosts = Array.from(postsList.children);
			oldPosts.splice(0, 1);

			oldPosts.forEach(child => {
				postsList.removeChild(child);
			});
		}

		currentFeedId++;
	}

	if (!searchQuery) {
		if (!document.querySelector(".empty-feed-warning"))
			addPost("<p class=\"empty-feed-warning\">There doesn't seem to be anything here.</p>", currentFeedId);
		return;
	}

	
	const url = `https://www.reddit.com/search/.json?q=${searchQuery}${currentFilterIndex != 0 ? "&limit=" + maxPosts : ""}${lastPostId ? "&after=" + lastPostId : ""}&type=${currentFilterIndex != null ? searchFilters[currentFilterIndex] : searchFilters.join("%2C")}&sort=relevance${allowSensitiveContent ? "&include_over_18=1" : ""}`;

	// console.log(url);

	fetch(url).then(function(result) {
		return result.json();
	}).then(async function(result) {
		const results = result.data ? [result] : result;

		if (!results.length)
			addPost("<p class=\"empty-feed-warning\">There doesn't seem to be anything here.</p>", currentFeedId);

		let previousPostCount = postCount;

		for (let i = 0; i < results.length; i++) {
			const searchResults = results[i].data.children;
	
			let skipped = 0;
			for (let i = 0; i < searchResults.length; i++) {
				const searchResult = searchResults[i].data;
				const feedId = currentFeedId;

				// console.log(searchResult);
	
				// Skip duplicate and sensitive results
				const duplicateSearchResult = document.querySelector(`[data-post-id="${searchResult.id}"]`);
				if ((duplicateSearchResult != null && duplicateSearchResult.id != "post-viewer") || (searchResult.over_18 && !allowSensitiveContent)) {
					skipped++;
					continue;
				}
	
				// Stop loading new posts if there's a new feed
				if (postsList.children[i - skipped] == null || (postsList.children[i - skipped].id != "filter-list" && postsList.children[i - skipped].getAttribute("data-feed-id") != currentFeedId))
					break;

				let post; 
				if (searchResults[i].kind == "t3") {
					post = await renderPost(searchResult, false);
				} else if (searchResults[i].kind == "t2") {
					post = renderUser(searchResult);
				} else if (searchResults[i].kind == "t5") {
					post = renderSubreddit(searchResult);
				}
	
				addPost(post, feedId);
	
				postCount++;
				lastPostId = searchResults[i].kind + "_" + searchResult.id;
			}
		}

		loadingNewPosts = false;

		// Automatically load new results if the last one is visible on the screen
		if (postCount > previousPostCount && isVisible(document.querySelector("#results-list .post:last-child")))
			setTimeout(() => {
				loadingNewPosts = true;
				renderSearchResults();
			}, 100);
	}).catch(function(error) {
		console.log(error);
	});
}