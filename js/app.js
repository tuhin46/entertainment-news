var app = angular.module("entertainmentApp", ["ngRoute"]);

app.config(function ($routeProvider, $locationProvider) {
    $locationProvider.hashPrefix('!');
    var publicResolve = { contentReady: function (ContentService) { return ContentService.load(false); } };

    $routeProvider
        .when("/home", {
            templateUrl: "pages/home.html",
            controller: "HomeController",
            resolve: publicResolve
        })
        .when("/movies", {
            templateUrl: "pages/movies.html",
            controller: "MoviesController",
            resolve: publicResolve
        })
        .when("/music", {
            templateUrl: "pages/music.html",
            controller: "MusicController",
            resolve: publicResolve
        })
        .when("/celebrities", {
            templateUrl: "pages/celebrities.html",
            controller: "CelebrityController",
            resolve: publicResolve
        })
        .when("/trending", {
            templateUrl: "pages/trending.html",
            controller: "TrendingController",
            resolve: publicResolve
        })
        .when("/influencers", {
            templateUrl: "pages/influencers.html",
            controller: "InfluencerController",
            resolve: publicResolve
        })
        .when("/bookmarks", {
            templateUrl: "pages/bookmarks.html",
            controller: "BookmarksController",
            resolve: publicResolve
        })
        .when("/news/:id", {
            templateUrl: "pages/news-details.html",
            controller: "NewsController",
            resolve: { contentReady: function (ContentService, AuthService) {
                return AuthService.check().then(function (admin) { return ContentService.load(admin); });
            } }
        })
        .when("/feedback", { templateUrl: "pages/feedback.html", controller: "FeedbackController" })
        .when("/about", {
            templateUrl: "pages/about.html"
        })
        .when("/admin/login", {
            templateUrl: "pages/admin-login.html",
            controller: "AdminLoginController"
        })
        .when("/admin/dashboard", {
            templateUrl: "pages/admin-dashboard.html",
            controller: "AdminDashboardController",
            resolve: {
                authCheck: function ($q, $location, AuthService, ContentService) {
                    return AuthService.check().then(function (admin) {
                        if (admin) return ContentService.load(true);
                        $location.path('/admin/login');
                        return $q.reject('not-authenticated');
                    });
                }
            }
        })
        .otherwise({
            redirectTo: "/home"
        });
});

// Root Controller: Shared Bookmarks, Trailer Modal, Ticker & Admin State
app.controller('AppController', function ($scope, $sce, $location, AuthService, ContentService) {
    // Load Bookmarks from LocalStorage
    $scope.bookmarks = JSON.parse(localStorage.getItem('ep_bookmarks') || '[]');

    $scope.isBookmarked = function (id) {
        return $scope.bookmarks.some(function (item) { return item.id === id; });
    };

    $scope.toggleBookmark = function (item, $event) {
        if ($event) $event.stopPropagation();
        var idx = $scope.bookmarks.findIndex(function (b) { return b.id === item.id; });
        if (idx > -1) {
            $scope.bookmarks.splice(idx, 1);
        } else {
            $scope.bookmarks.push(item);
        }
        localStorage.setItem('ep_bookmarks', JSON.stringify($scope.bookmarks));
    };

    // Video Trailer Modal Logic
    $scope.activeTrailer = null;
    $scope.openTrailer = function (item, $event) {
        if ($event) $event.stopPropagation();
        $scope.activeTrailer = {
            title: item.title,
            videoUrl: $sce.trustAsResourceUrl(item.trailer || "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1")
        };
    };

    $scope.closeTrailer = function () {
        $scope.activeTrailer = null;
    };

    // Breaking News Ticker (managed live from Admin Panel)
    $scope.tickerText = ContentService.getTicker();
    $scope.$on('tickerUpdated', function (event, text) {
        $scope.tickerText = text;
    });

    // Admin Access State (drives the navbar lock icon)
    $scope.isAdminLoggedIn = AuthService.isLoggedIn();
    AuthService.check();
    $scope.$on('authUpdated', function (event, value) { $scope.isAdminLoggedIn = value; });
    $scope.$on('$routeChangeSuccess', function () {
        $scope.isAdminLoggedIn = AuthService.isLoggedIn();
        ContentService.recordVisit();
    });
});

app.controller('HomeController', function ($scope, ContentService) {
    $scope.allList = ContentService.getPublished();
    $scope.trendingSpotlightList = ContentService.getByCategory('Trending', true).slice(0, 4);
    var influencerSpotlight = ContentService.getByCategory('Influencers', true).slice(0, 2);
    var celebritySpotlight = ContentService.getByCategory('Celebrities', true).slice(0, 2);
    $scope.spotlightList = influencerSpotlight.concat(celebritySpotlight).sort(function (a, b) {
        return ((b.pinned ? 1 : 0) - (a.pinned ? 1 : 0)) || (b.id - a.id);
    });
    $scope.selectedCategory = '';
    $scope.categoryOptions = [
        { label: 'All Categories', value: '' },
        { label: 'Movies', value: 'Movies' },
        { label: 'Music', value: 'Music' },
        { label: 'Celebrities', value: 'Celebrities' },
        { label: 'Trending', value: 'Trending' },
        { label: 'Influencers', value: 'Influencers' }
    ];
    $scope.searchInput = '';
    $scope.activeSearch = '';
    $scope.searchResults = [];

    // Triggered on click of Search Button or Enter key
    $scope.executeSearch = function () {
        $scope.activeSearch = $scope.searchInput.trim();
        performFilter();
    };

    // Live search as you type
    $scope.onTyping = function () {
        $scope.activeSearch = $scope.searchInput.trim();
        performFilter();
    };

    // Clear Search Action
    $scope.clearSearch = function () {
        $scope.searchInput = '';
        $scope.activeSearch = '';
        $scope.searchResults = [];
    };

    $scope.onCategoryChange = function () {
        if ($scope.activeSearch) performFilter();
    };

    function performFilter() {
        if (!$scope.activeSearch && !$scope.selectedCategory) {
            $scope.searchResults = [];
            return;
        }

        var query = $scope.activeSearch.toLowerCase();
        $scope.searchResults = $scope.allList.filter(function (item) {
            var matchQuery = !query ||
                item.title.toLowerCase().indexOf(query) > -1 ||
                item.category.toLowerCase().indexOf(query) > -1 ||
                item.year.indexOf(query) > -1 ||
                item.summary.toLowerCase().indexOf(query) > -1;

            var matchCategory = !$scope.selectedCategory || item.category === $scope.selectedCategory;

            return matchQuery && matchCategory;
        });
    }
});

app.controller('MoviesController', function ($scope, ContentService) {
    $scope.moviesList = ContentService.getByCategory("Movies", true);
});

app.controller('MusicController', function ($scope, ContentService) {
    $scope.musicList = ContentService.getByCategory("Music", true);
});

app.controller('CelebrityController', function ($scope, ContentService) {
    $scope.celebrityList = ContentService.getByCategory("Celebrities", true);
});

app.controller('TrendingController', function ($scope, ContentService) {
    $scope.trendingList = ContentService.getByCategory("Trending", true);
});

app.controller('InfluencerController', function ($scope, ContentService) {
    $scope.influencerList = ContentService.getByCategory("Influencers", true);
});

app.controller('BookmarksController', function ($scope) {
    // Uses parent scope bookmarks
});

app.controller('NewsController', function ($scope, $routeParams, ContentService) {
    var id = parseInt($routeParams.id);
    var found = ContentService.getById(id);
    $scope.article = found;
    if (found) ContentService.recordView(id);
});

app.run(function ($rootScope) {
    $rootScope.$on('$routeChangeStart', function () { $rootScope.storageLoading = true; });
    $rootScope.$on('$routeChangeSuccess', function () {
        $rootScope.storageLoading = false;
        $rootScope.storageError = '';
    });
    $rootScope.$on('$routeChangeError', function (event, next, previous, error) {
        $rootScope.storageLoading = false;
        $rootScope.storageError = error === 'not-authenticated' ? '' :
            (error.message || 'Content could not be loaded. Please refresh to retry.');
    });
});
