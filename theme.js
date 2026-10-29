// ─── Pocket Bunny — dark mode ────────────────────────────────────────────────
// Loaded in the <head> of every page so the saved theme is applied BEFORE the
// page paints (no white flash). The Settings page flips it with PBTheme.toggle().
(function () {
    var KEY = 'pb_theme';

    function saved() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }
    function apply(theme) {
        document.documentElement.setAttribute('data-theme', theme === 'dark' ? 'dark' : 'light');
    }

    apply(saved());

    window.PBTheme = {
        isDark: function () { return document.documentElement.getAttribute('data-theme') === 'dark'; },
        set: function (theme) {
            try { localStorage.setItem(KEY, theme); } catch (e) { /* ignore */ }
            apply(theme);
        },
        toggle: function () {
            var next = this.isDark() ? 'light' : 'dark';
            this.set(next);
            return next;
        }
    };

    // Changing the theme in one tab updates the other open tabs too.
    window.addEventListener('storage', function (e) {
        if (e.key === KEY) apply(e.newValue);
    });
})();
