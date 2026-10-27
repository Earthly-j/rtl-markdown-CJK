// English words and numbers (with the spaces/punctuation between them) keep reading left-to-right,
// and like Arabic/Hebrew a sign touching a number stays with it: $100, #3, -5, ￥1000, 50%
const ltrPattern = /(?:[$#+\-€£¥￥₩](?=[0-9]))?[A-Za-z0-9]+(?:[ .,:'\-\/_%+]+[A-Za-z0-9]+)*(?:(?<=[0-9])[%％])?/g

const isolateLtrRuns = () => {
    if (!document.body.classList.contains('vscode-body--rtl')) {
        return
    }

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
        acceptNode: (node) => (node.parentElement.closest('pre, code, script, style, .rtl-markdown-ltr') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
    })
    const nodes = []
    while (walker.nextNode()) {
        nodes.push(walker.currentNode)
    }

    nodes.forEach((node) => {
        const text = node.nodeValue
        const fragment = document.createDocumentFragment()
        let last = 0
        for (const match of text.matchAll(ltrPattern)) {
            const span = document.createElement('span')
            span.className = 'rtl-markdown-ltr'
            span.textContent = match[0]
            fragment.append(text.slice(last, match.index), span)
            last = match.index + match[0].length
        }
        if (last > 0) {
            fragment.append(text.slice(last))
            node.replaceWith(fragment)
        }
    })
}

try {
    const data = JSON.parse(document.head.querySelector('meta[id="vscode-markdown-preview-data"]').getAttribute('data-state'))
    if (typeof data.resource === 'string') {
        if (data.resource.match(/\.rtl\.md$/)) {
            document.body.classList.add('vscode-body--rtl')
        }
    }
    isolateLtrRuns()
    window.addEventListener('load', isolateLtrRuns)
    window.addEventListener('vscode.markdown.updateContent', isolateLtrRuns)
} catch (e) {
    console.log(e)
}
