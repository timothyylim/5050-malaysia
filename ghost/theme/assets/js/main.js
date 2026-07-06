// Fill monogram avatars from data-name (no profile photos exist in the source data).
(function () {
    function initials(n) {
        return (n || '').split(/\s+/).filter(Boolean).slice(0, 2)
            .map(function (w) { return w[0]; }).join('').toUpperCase();
    }
    document.querySelectorAll('.avatar[data-name]').forEach(function (el) {
        el.textContent = initials(el.getAttribute('data-name'));
    });
})();
