var fs = require('fs'),
    footerString = '',
    cfg,
    hasFooterFile;

module.exports = {
    hooks: {
        // called on each book & each language book
        'init': function() {
            cfg = this.config.get('pluginsConfig.localized-footer'), _this = this;

            try {
                fs.statSync(this.resolve(cfg.filename));
                hasFooterFile = true;
            } catch (e) {
                hasFooterFile = false;
                return;
            }

            deprecationWarning(this);

            this.readFileAsString(cfg.filename)
                .then(function(data) {
                    return _this.renderBlock('markdown', data);
                }, this.log.error)
                .then(function(html) {
                    footerString = html;
                }, this.log.error);
        },
        'page:before': function(page) {
            // append to the website renderer only
            if (this.output.name !== 'website' || !hasFooterFile) return page;
            page.content = page.content + '\n{% localizedfooter %}' + footerString + '{% endlocalizedfooter%}';
            return page;
        }
    },
    blocks: {
        'localizedfooter': {
            process: function(block) {
                var hline = cfg.hline ? '<hr>' : '';
                return '<div id="page-footer" class="localized-footer">' + hline + block.body + '</div>';
            }
        }
    }
};

function deprecationWarning(ctx) {

    if (!hasFooterFile) return;

    // search website.css for deprecated style selector
    ctx.readFileAsString(ctx.config.get('styles.website'))
        .then(function(css) {
            var lines = css.split('\n');

            for (var i = 0; i < lines.length; i++) {
                if (lines[i].search('#page-footer') !== -1) {
                    return ctx.log.warn(
                        '[localized-footer] the css selector \'#page-footer\'' +
                        'is deprecated, use \'.localized-footer\' instead.'
                    )
                }
            };
        })
        .catch(function(err) {
            // no style file present, ignore
        });
}
