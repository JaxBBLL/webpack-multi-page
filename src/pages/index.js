import '@styles/app.less'

const $box = $('.box')
const arr = ['Peter', 'Jack', 'Lucy'].map(item => `<li>${item}</li>`)
arr.unshift('<ul>')
arr.push('</ul>')
$box.append(arr.join(''))
