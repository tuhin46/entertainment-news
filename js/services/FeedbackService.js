app.factory('FeedbackService', function () {

    var STORAGE_KEY = 'ep_feedback';

    function load() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (e) {
            return [];
        }
    }

    var list = load();

    function persist() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
        } catch (e) {
            // storage full - feedback is non-critical, fail silently
        }
    }

    var svc = {};

    svc.getAll = function () {
        return list.slice().sort(function (a, b) { return b.id - a.id; });
    };

    svc.add = function (entry) {
        entry.id = Date.now();
        entry.date = new Date().toISOString();
        list.push(entry);
        persist();
        return entry;
    };

    svc.remove = function (id) {
        list = list.filter(function (i) { return i.id !== id; });
        persist();
    };

    return svc;
});
