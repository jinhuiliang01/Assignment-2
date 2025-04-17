document.body.style.margin   = 0
document.body.style.overflow = `hidden`

const cnv = document.getElementById (`cnv_element`)
cnv.width = innerWidth
cnv.height = innerHeight

const ctx = cnv.getContext (`2d`)

const draw_frame = ms => {
   ctx.fillStyle = `turquoise`
   ctx.fillRect (0, 0, innerWidth, innerHeight)

   const seconds = (ms / 1000)
   console.log (seconds.toFixed (2))

   requestAnimationFrame (draw_frame)
}

draw_frame ()

onresize = () => {
   cnv.width = innerWidth
   cnv.height = innerHeight   
}