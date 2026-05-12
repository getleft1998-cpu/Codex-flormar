import { useState, useEffect } from 'react'
import Head from 'next/head'
import { CATS, CATEGORY_META, T, getName, fmt, GOVERNORATES } from '../lib/data'
import ProfessionalAdminDashboard from '../components/ProfessionalAdminDashboard'

const ADMIN_TOKEN_KEY = 'flormar_admin_token'

const CATEGORY_IMAGE_OVERRIDES = {
  face: '/images/category-face.jpg',
  eyes: '/images/category-eyes.jpg',
  lips: '/images/category-lips.jpg',
  nails: '/images/category-nails.jpg',
  skincare: '/images/category-skincare.jpg',
  accessories: '/images/category-accessories.jpg',
}

const DEFAULT_STORE_SETTINGS = {
  store_name: 'Flormar Tunisie',
  hero_title_fr: 'Votre beaute,\nvotre style',
  hero_title_ar: '',
  hero_subtitle_fr: 'Produits de maquillage premium a prix accessibles. Livraison gratuite dans toute la Tunisie.',
  hero_subtitle_ar: '',
  hero_image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80',
  announcement_fr: 'Livraison gratuite · Paiement a la livraison',
  announcement_ar: '',
  promotional_text_fr: 'Paiement a la livraison',
  promotional_text_ar: '',
  delivery_message_fr: 'Livraison gratuite',
  delivery_message_ar: '',
  cod_text_fr: '',
  cod_text_ar: '',
  footer_text_fr: 'Tous droits reserves.',
  footer_text_ar: '',
  phone: '',
  whatsapp_number: '',
  instagram_url: '',
  facebook_url: '',
  tiktok_url: '',
  currency_label: '',
}

function normalizeStoreSettings(settings = {}) {
  return { ...DEFAULT_STORE_SETTINGS, ...(settings || {}) }
}

function storeText(settings, key, lang, fallback) {
  const safeSettings = normalizeStoreSettings(settings)
  return safeSettings[`${key}_${lang}`] || safeSettings[`${key}_fr`] || fallback
}

function normalizeExternalUrl(value = '') {
  const url = String(value || '').trim()
  if (!url) return ''
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768)
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  return isMobile
}

function getWhatsappNumber(settings) {
  const safeSettings = normalizeStoreSettings(settings)
  return (safeSettings.whatsapp_number || process.env.NEXT_PUBLIC_WHATSAPP || '').replace(/\D/g, '')
}

function buildWhatsappOrderUrl(order, lang, t, settings) {
  const number = getWhatsappNumber(settings)
  if (!number || !order) return ''

  const lines = [
    `Nouvelle commande #${order.id}`,
    `${t.customerInfo}: ${order.customer_name}`,
    `${t.phone}: ${order.customer_phone}`,
    `${t.governorate}: ${order.governorate}`,
    `${t.city}: ${order.city}`,
    `${t.address}: ${order.address}`,
    `${t.products}:`,
    ...(order.items || []).map(item => {
      const variant = item.shadeName
        ? ` (${t.shade}: ${item.shadeName}${item.sku ? `, ${t.reference}: ${item.sku}` : ''})`
        : ''
      return `- ${getName(item, lang)}${variant} x${item.qty}: ${fmt(item.price * item.qty, t.tnd)}`
    }),
    `${t.total}: ${fmt(order.total, t.tnd)}`,
  ]

  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`
}

function defaultCategories(t) {
  return CATS.map(slug => ({
    slug,
    nameFr: t.catLabels[slug],
    nameAr: t.catLabels[slug],
    imageUrl: CATEGORY_META[slug]?.imageUrl,
  }))
}

function getCategoryLabel(category, slug, lang, t) {
  if (category) return lang === 'ar' ? (category.nameAr || t.catLabels[slug]) : (category.nameFr || t.catLabels[slug])
  return t.catLabels[slug] || slug
}

function getCategoryImage(category, slug, fallback = '') {
  return category?.imageUrl || CATEGORY_IMAGE_OVERRIDES[slug] || CATEGORY_META[slug]?.imageUrl || fallback
}

function getCategoryMeta(category, slug, lang) {
  const local = CATEGORY_META[slug]?.[lang] || { hero: slug, sub: '' }
  return {
    hero: lang === 'ar' ? (category?.heroAr || local.hero) : (category?.heroFr || local.hero),
    sub: lang === 'ar' ? (category?.descriptionAr || local.sub) : (category?.descriptionFr || local.sub),
  }
}

function getDescription(product, lang) {
  if (!product) return ''
  if (lang === 'ar') return product.descriptionAr || product.description_ar || product.descriptionFr || product.description_fr || ''
  return product.descriptionFr || product.description_fr || product.descriptionAr || product.description_ar || ''
}

function getCartItemKey(item) {
  return item.cartKey || `${item.id || item.productId}:${item.variantId || 'base'}`
}

function addProductToCart(setCart, product, selectedVariant) {
  const productPrice = product.salePrice !== null && product.salePrice !== undefined ? product.salePrice : product.price
  const finalPrice = selectedVariant && selectedVariant.price !== null ? selectedVariant.price : productPrice
  const imageSrc = selectedVariant?.image || product.image
  const cartKey = `${product.id}:${selectedVariant?.id || 'base'}`
  const item = {
    ...product,
    cartKey,
    variantId: selectedVariant?.id || null,
    shadeName: selectedVariant?.shadeName || '',
    sku: selectedVariant?.sku || product.sku || '',
    colorHex: selectedVariant?.colorHex || '',
    image: imageSrc,
    price: finalPrice,
    qty: 1,
  }

  setCart(prev => {
    const existing = prev.find(cartItem => getCartItemKey(cartItem) === cartKey)
    if (existing) return prev.map(cartItem => getCartItemKey(cartItem) === cartKey ? { ...cartItem, qty: cartItem.qty + 1 } : cartItem)
    return [...prev, item]
  })
}

// ─── CART DRAWER ──────────────────────────────────────────────────────────────
function CartDrawer({ open, onClose, cart, setCart, t, lang, onCheckout, isMobile }) {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const upd = (key, d) => setCart(p => p.map(i => getCartItemKey(i) === key ? { ...i, qty: Math.max(1, i.qty + d) } : i))
  const rem = (key) => setCart(p => p.filter(i => getCartItemKey(i) !== key))

  return (
    <>
      {open && <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1998 }} />}
      <div style={{
        position: 'fixed', top: 0, right: open ? 0 : (isMobile ? '-100vw' : '-420px'), width: isMobile ? '100vw' : 390, maxWidth: '100vw', height: '100vh',
        background: '#fff', zIndex: 1999, transition: 'right 0.32s cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', boxShadow: '-4px 0 28px rgba(0,0,0,0.11)',
        direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: "'Montserrat',sans-serif",
      }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f0e6ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontFamily: "'Cormorant Garamond',serif", color: '#c8254e' }}>{t.cart}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#bbb' }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px' }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#ccc', marginTop: 80, fontSize: 13 }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🛍️</div>{t.emptyCart}
            </div>
          ) : cart.map(item => (
            <div key={getCartItemKey(item)} style={{ display: 'flex', gap: 12, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid #f8f0f3' }}>
              <img src={item.image} alt="" onError={e => { e.currentTarget.style.display = 'none' }} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, background: '#f8f0f3' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#222', marginBottom: 4, lineHeight: 1.4 }}>{getName(item, lang)}</div>
                {item.shadeName && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#999', fontSize: 10, marginBottom: 5, lineHeight: 1.4 }}>
                    {item.colorHex && <span style={{ width: 12, height: 12, borderRadius: '50%', background: item.colorHex, border: '1px solid #eee', display: 'inline-block', flexShrink: 0 }} />}
                    <span>{t.shade}: {item.shadeName}{item.sku ? ` · ${t.reference}: ${item.sku}` : ''}</span>
                  </div>
                )}
                <div style={{ color: '#c8254e', fontWeight: 700, fontSize: 13, marginBottom: 8 }}>{fmt(item.price, t.tnd)}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => upd(getCartItemKey(item), -1)} style={{ width: 24, height: 24, border: '1px solid #f0e6ea', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#c8254e', fontWeight: 700 }}>−</button>
                  <span style={{ fontWeight: 700, fontSize: 13, minWidth: 18, textAlign: 'center' }}>{item.qty}</span>
                  <button onClick={() => upd(getCartItemKey(item), 1)} style={{ width: 24, height: 24, border: '1px solid #f0e6ea', borderRadius: 4, cursor: 'pointer', background: '#fff', color: '#c8254e', fontWeight: 700 }}>+</button>
                  <button onClick={() => rem(getCartItemKey(item))} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ddd', cursor: 'pointer', fontSize: 16 }}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {cart.length > 0 && (
          <div style={{ padding: '14px 24px 26px', borderTop: '1px solid #f0e6ea' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: '#999' }}>
              <span>{t.delivery}</span><span style={{ color: '#2ecc71', fontWeight: 700 }}>{t.free} ✓</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 18, fontSize: 16, fontWeight: 700 }}>
              <span>{t.total}</span><span style={{ color: '#c8254e' }}>{fmt(total, t.tnd)}</span>
            </div>
            <button onClick={onCheckout} style={{ width: '100%', background: '#c8254e', color: '#fff', border: 'none', borderRadius: 8, padding: '14px', fontSize: 14, fontWeight: 700, cursor: 'pointer', letterSpacing: 1, fontFamily: "'Montserrat',sans-serif" }}>
              {t.checkout} →
            </button>
          </div>
        )}
      </div>
    </>
  )
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ lang, setLang, t, cart, setCart, activeCat, navigate, setPage, openAdmin, isMobile, categories, settings }) {
  const [cartOpen, setCartOpen] = useState(false)
  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const navCategories = categories.length ? categories : defaultCategories(t)

  return (
    <>
      <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, background: '#fff', boxShadow: '0 1px 12px rgba(0,0,0,0.06)', fontFamily: "'Montserrat',sans-serif" }}>
        <div style={{ background: '#c8254e', color: '#fff', textAlign: 'center', fontSize: isMobile ? 10 : 11, padding: '5px 10px', letterSpacing: isMobile ? 1 : 2 }}>
          {storeText(settings, 'announcement', lang, lang === 'ar' ? 'توصيل مجاني · الدفع عند الاستلام' : 'Livraison gratuite · Paiement a la livraison')}
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: isMobile ? 54 : 58, gap: 10 }}>
          <div onClick={() => navigate('home')} style={{ cursor: 'pointer', lineHeight: 1, userSelect: 'none' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#c8254e', letterSpacing: 3, fontFamily: "'Cormorant Garamond',serif" }}>FLORMAR</div>
            <div style={{ fontSize: 8, color: '#ccc', letterSpacing: 4 }}>TUNISIE</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 6 : 10, flexShrink: 0 }}>
            <div style={{ display: 'flex', background: '#f8f0f3', borderRadius: 20, overflow: 'hidden', fontSize: 10 }}>
              {['fr', 'ar'].map(l => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: '5px 13px', border: 'none', cursor: 'pointer', fontWeight: 700, fontFamily: "'Montserrat',sans-serif", background: lang === l ? '#c8254e' : 'transparent', color: lang === l ? '#fff' : '#c8254e', transition: 'all 0.2s' }}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button onClick={openAdmin} style={{ background: 'none', border: '1px solid #eee', borderRadius: 6, padding: isMobile ? '5px 8px' : '5px 12px', cursor: 'pointer', fontSize: 10, color: '#aaa', fontFamily: "'Montserrat',sans-serif", whiteSpace: 'nowrap' }}>
              ⚙ {t.admin}
            </button>
            <button onClick={() => setCartOpen(true)} style={{ position: 'relative', background: '#c8254e', color: '#fff', border: 'none', borderRadius: 50, width: 38, height: 38, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              🛍️
              {cartCount > 0 && <span style={{ position: 'absolute', top: -4, right: -4, background: '#1a1a1a', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{cartCount}</span>}
            </button>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #f5eaee', overflowX: 'auto' }}>
          <nav style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 12px' : '0 24px', display: 'flex', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            {navCategories.map(category => {
              const cat = category.slug
              const active = activeCat === cat
              return (
                <button key={cat} onClick={() => navigate(cat)} style={{ padding: isMobile ? '9px 12px' : '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: isMobile ? 10 : 11, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', fontFamily: "'Montserrat',sans-serif", whiteSpace: 'nowrap', color: active ? '#c8254e' : '#777', borderBottom: active ? '2px solid #c8254e' : '2px solid transparent', transition: 'all 0.18s', marginBottom: -1 }}>
                  {getCategoryLabel(category, cat, lang, t)}
                </button>
              )
            })}
          </nav>
        </div>
      </header>
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} cart={cart} setCart={setCart} t={t} lang={lang} isMobile={isMobile}
        onCheckout={() => { setCartOpen(false); setPage('checkout'); window.scrollTo({ top: 0, behavior: 'smooth' }) }} />
    </>
  )
}

// ─── PRODUCT CARD ─────────────────────────────────────────────────────────────
function ProductCard({ product, t, lang, setCart, onView }) {
  const [added, setAdded] = useState(false)
  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [shadeError, setShadeError] = useState('')
  const variants = (product.variants || []).filter(variant => variant.isActive !== false)
  const hasVariants = variants.length > 0
  const selectedVariant = variants.find(variant => String(variant.id) === String(selectedVariantId))
  const productHasStock = product.inStock !== false && Number(product.stockQuantity || 0) > 0
  const inStock = productHasStock
  const canAddSelected = hasVariants ? Boolean(selectedVariant && selectedVariant.inStock) : productHasStock
  const productSalePrice = product.salePrice !== null && product.salePrice !== undefined && Number(product.salePrice) < Number(product.price)
  const productDisplayPrice = productSalePrice ? product.salePrice : product.price
  const finalPrice = selectedVariant && selectedVariant.price !== null ? selectedVariant.price : productDisplayPrice
  const imageSrc = selectedVariant?.image || product.image
  const discounted = productSalePrice || (selectedVariant && selectedVariant.price !== null && Number(selectedVariant.price) < Number(product.price))
  const add = () => {
    if (hasVariants && !selectedVariant) {
      setShadeError(t.shadeRequired)
      return
    }
    if (!canAddSelected) return
    addProductToCart(setCart, product, selectedVariant)
    setShadeError('')
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  return (
    <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 14px rgba(200,37,78,0.05)', transition: 'transform 0.2s,box-shadow 0.2s', opacity: productHasStock ? 1 : 0.58 }}
      onMouseEnter={e => { if (!productHasStock) return; e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 28px rgba(200,37,78,0.13)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 14px rgba(200,37,78,0.05)' }}>
      <div onClick={() => onView?.(product)} style={{ position: 'relative', paddingTop: '100%', background: '#f8f0f3', overflow: 'hidden', cursor: 'pointer' }}>
        <img src={imageSrc} alt={getName(product, lang)}
          onError={e => { e.currentTarget.style.display = 'none' }}
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
        {product.tag && (
          <div style={{ position: 'absolute', top: 10, left: 10, background: product.tag === 'new' ? '#2ecc71' : '#c8254e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '3px 9px', borderRadius: 20, fontFamily: "'Montserrat',sans-serif", letterSpacing: 1, textTransform: 'uppercase' }}>
            {product.tag === 'new' ? (lang === 'ar' ? 'جديد' : 'NOUVEAU') : (lang === 'ar' ? 'الأكثر مبيعاً' : 'BEST')}
          </div>
        )}
        {!productHasStock && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat',sans-serif", fontSize: 11, fontWeight: 800, color: '#c8254e', letterSpacing: 1, textTransform: 'uppercase' }}>
            {t.outOfStock}
          </div>
        )}
      </div>
      <div style={{ padding: '13px 14px', fontFamily: "'Montserrat',sans-serif" }}>
        <p onClick={() => onView?.(product)} style={{ margin: '0 0 5px', fontSize: 12, color: '#333', fontWeight: 600, lineHeight: 1.4, minHeight: 32, direction: lang === 'ar' ? 'rtl' : 'ltr', cursor: 'pointer' }}>
          {getName(product, lang)}
        </p>
        <p style={{ margin: '0 0 11px', fontSize: 15, color: '#c8254e', fontWeight: 700, fontFamily: "'Cormorant Garamond',serif" }}>
          {discounted && <span style={{ color: '#aaa', textDecoration: 'line-through', marginRight: 7, fontSize: 12 }}>{fmt(product.price, t.tnd)}</span>}
          {fmt(finalPrice, t.tnd)}
        </p>
        {hasVariants && (
          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#999', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 }}>{t.chooseShade}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {variants.map(variant => {
                const selected = String(selectedVariantId) === String(variant.id)
                return (
                  <button key={variant.id} onClick={() => { setSelectedVariantId(variant.id); setShadeError('') }} disabled={!variant.inStock}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, maxWidth: '100%', border: selected ? '1.5px solid #c8254e' : '1px solid #f0e6ea', background: selected ? '#fff6f8' : '#fff', color: variant.inStock ? '#555' : '#bbb', borderRadius: 6, padding: '5px 7px', cursor: variant.inStock ? 'pointer' : 'not-allowed', fontSize: 10, fontWeight: 700, fontFamily: "'Montserrat',sans-serif" }}>
                    {variant.colorHex && <span style={{ width: 12, height: 12, borderRadius: '50%', background: variant.colorHex, border: '1px solid #e8dce0', flexShrink: 0 }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{variant.shadeName}</span>
                  </button>
                )
              })}
            </div>
            {shadeError && <p style={{ color: '#c8254e', fontSize: 10, lineHeight: 1.4, margin: '6px 0 0' }}>{shadeError}</p>}
          </div>
        )}
        <button onClick={() => onView?.(product)} style={{ width: '100%', background: '#fff', color: '#c8254e', border: '1px solid #f0d5de', borderRadius: 6, padding: '8px', fontSize: 10, fontWeight: 800, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif", letterSpacing: 0.5, marginBottom: 7 }}>
          {t.viewDetails}
        </button>
        <button onClick={add} disabled={!productHasStock || (selectedVariant && !selectedVariant.inStock)} style={{ width: '100%', background: (!productHasStock || (selectedVariant && !selectedVariant.inStock)) ? '#ddd' : (added ? '#2ecc71' : '#c8254e'), color: '#fff', border: 'none', borderRadius: 6, padding: '9px', fontSize: 11, fontWeight: 700, cursor: productHasStock ? 'pointer' : 'not-allowed', fontFamily: "'Montserrat',sans-serif", transition: 'background 0.3s' }}>
          {!inStock ? t.outOfStock : (added ? '✓ ' + (lang === 'ar' ? 'أضيف' : 'Ajouté') : t.addToCart)}
        </button>
      </div>
    </div>
  )
}

// ─── HOME PAGE ────────────────────────────────────────────────────────────────
// PRODUCT DETAIL
function ProductDetailPage({ product, lang, t, navigate, setCart, isMobile, categories }) {
  const safeProduct = product || {}
  const variants = (safeProduct.variants || []).filter(variant => variant.isActive !== false)
  const hasVariants = variants.length > 0
  const category = categories.find(c => c.slug === safeProduct.category)
  const gallery = Array.from(new Set([
    safeProduct.image,
    safeProduct.imageUrl,
    ...variants.map(variant => variant.image || variant.imageUrl),
  ].filter(Boolean)))

  const [selectedVariantId, setSelectedVariantId] = useState('')
  const [shadeError, setShadeError] = useState('')
  const [added, setAdded] = useState(false)
  const [activeImage, setActiveImage] = useState(gallery[0] || '')

  const selectedVariant = variants.find(variant => String(variant.id) === String(selectedVariantId))
  const productHasStock = safeProduct.inStock !== false && Number(safeProduct.stockQuantity || 0) > 0
  const canAddSelected = hasVariants ? Boolean(selectedVariant && selectedVariant.inStock) : productHasStock
  const productSalePrice = safeProduct.salePrice !== null && safeProduct.salePrice !== undefined && Number(safeProduct.salePrice) < Number(safeProduct.price)
  const productDisplayPrice = productSalePrice ? safeProduct.salePrice : safeProduct.price
  const finalPrice = selectedVariant && selectedVariant.price !== null ? selectedVariant.price : productDisplayPrice
  const discounted = productSalePrice || (selectedVariant && selectedVariant.price !== null && Number(selectedVariant.price) < Number(safeProduct.price))
  const description = getDescription(safeProduct, lang)
  const reference = selectedVariant?.sku || safeProduct.sku || ''

  useEffect(() => {
    setSelectedVariantId('')
    setShadeError('')
    setAdded(false)
    setActiveImage(gallery[0] || '')
  }, [safeProduct.id])

  useEffect(() => {
    if (selectedVariant?.image) setActiveImage(selectedVariant.image)
  }, [selectedVariantId])

  const add = () => {
    if (hasVariants && !selectedVariant) {
      setShadeError(t.shadeRequired)
      return
    }
    if (!canAddSelected) return
    addProductToCart(setCart, safeProduct, selectedVariant)
    setShadeError('')
    setAdded(true)
    setTimeout(() => setAdded(false), 1400)
  }

  if (!product) {
    return (
      <div style={{ maxWidth: 900, margin: isMobile ? '124px auto 50px' : '136px auto 60px', padding: '0 20px', fontFamily: "'Montserrat',sans-serif" }}>
        <button onClick={() => navigate('home')} style={{ background: '#fff', border: '1px solid #f0d5de', borderRadius: 8, padding: '10px 16px', color: '#c8254e', cursor: 'pointer', fontWeight: 700 }}>
          {t.backToProducts}
        </button>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 1180, margin: isMobile ? '124px auto 50px' : '136px auto 70px', padding: isMobile ? '0 16px' : '0 24px', direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: "'Montserrat',sans-serif" }}>
      <button onClick={() => navigate(safeProduct.category || 'home')} style={{ background: '#fff', color: '#c8254e', border: '1px solid #f0d5de', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 800, marginBottom: 18, fontFamily: "'Montserrat',sans-serif" }}>
        {t.backToProducts}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'minmax(0,1fr) minmax(0,1fr)', gap: isMobile ? 22 : 38, alignItems: 'start' }}>
        <div>
          <div style={{ background: '#fff', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 30px rgba(200,37,78,0.08)' }}>
            <div style={{ aspectRatio: '1 / 1', background: '#f8f0f3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {activeImage ? (
                <img src={activeImage} alt={getName(safeProduct, lang)} onError={e => { e.currentTarget.style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ color: '#c8254e', fontFamily: "'Cormorant Garamond',serif", fontSize: 34, letterSpacing: 3 }}>FLORMAR</div>
              )}
            </div>
          </div>
          {gallery.length > 1 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(64px,1fr))', gap: 8, marginTop: 12 }}>
              {gallery.map(image => (
                <button key={image} onClick={() => setActiveImage(image)} style={{ border: activeImage === image ? '2px solid #c8254e' : '1px solid #f0e6ea', borderRadius: 8, padding: 0, overflow: 'hidden', background: '#fff', cursor: 'pointer', aspectRatio: '1 / 1' }}>
                  <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#fff', borderRadius: 14, padding: isMobile ? 20 : 28, boxShadow: '0 8px 30px rgba(200,37,78,0.06)' }}>
          <div style={{ fontSize: 10, color: '#c8254e', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>
            {getCategoryLabel(category, safeProduct.category, lang, t)}
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 34 : 44, lineHeight: 1.05, color: '#1a1a1a', margin: '0 0 12px' }}>
            {getName(safeProduct, lang)}
          </h1>
          <div style={{ color: '#c8254e', fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 700, marginBottom: 14 }}>
            {discounted && <span style={{ color: '#aaa', textDecoration: 'line-through', marginRight: 9, fontSize: 18 }}>{fmt(safeProduct.price, t.tnd)}</span>}
            {fmt(finalPrice, t.tnd)}
          </div>
          {reference && (
            <div style={{ color: '#999', fontSize: 11, fontWeight: 700, marginBottom: 18 }}>
              {t.reference}: {reference}
            </div>
          )}

          <div style={{ borderTop: '1px solid #f8f0f3', paddingTop: 18, marginBottom: 20 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>{t.description}</div>
            <p style={{ color: '#666', fontSize: 13, lineHeight: 1.9, margin: 0 }}>
              {description || getName(safeProduct, lang)}
            </p>
          </div>

          {hasVariants && (
            <div style={{ borderTop: '1px solid #f8f0f3', paddingTop: 18, marginBottom: 20 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: '#999', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{t.chooseShade}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {variants.map(variant => {
                  const selected = String(selectedVariantId) === String(variant.id)
                  return (
                    <button key={variant.id} onClick={() => { setSelectedVariantId(variant.id); setShadeError('') }} disabled={!variant.inStock}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, border: selected ? '2px solid #c8254e' : '1px solid #f0e6ea', background: selected ? '#fff6f8' : '#fff', color: variant.inStock ? '#333' : '#bbb', borderRadius: 8, padding: '9px 11px', cursor: variant.inStock ? 'pointer' : 'not-allowed', fontSize: 12, fontWeight: 800, fontFamily: "'Montserrat',sans-serif" }}>
                      {variant.colorHex && <span style={{ width: 16, height: 16, borderRadius: '50%', background: variant.colorHex, border: '1px solid #e8dce0', flexShrink: 0 }} />}
                      <span>{variant.shadeName}</span>
                    </button>
                  )
                })}
              </div>
              {selectedVariant && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 10, lineHeight: 1.6 }}>
                  {t.shade}: {selectedVariant.shadeName}{selectedVariant.sku ? ` · ${t.reference}: ${selectedVariant.sku}` : ''}
                </div>
              )}
              {shadeError && <p style={{ color: '#c8254e', fontSize: 11, lineHeight: 1.5, margin: '8px 0 0' }}>{shadeError}</p>}
            </div>
          )}

          <button onClick={add} disabled={!productHasStock || (selectedVariant && !selectedVariant.inStock)}
            style={{ width: '100%', background: (!productHasStock || (selectedVariant && !selectedVariant.inStock)) ? '#ddd' : (added ? '#2ecc71' : '#c8254e'), color: '#fff', border: 'none', borderRadius: 10, padding: '15px', fontSize: 14, fontWeight: 800, cursor: productHasStock ? 'pointer' : 'not-allowed', fontFamily: "'Montserrat',sans-serif", letterSpacing: 0.8 }}>
            {!productHasStock ? t.outOfStock : (added ? (lang === 'ar' ? 'Added' : 'Ajoute') : t.addToCart)}
          </button>
        </div>
      </div>
    </div>
  )
}

function HomePage({ lang, t, navigate, setCart, isMobile, products, categories, catalogLoading, catalogError, settings, onViewProduct }) {
  const catImages = {
    face: 'https://images.unsplash.com/photo-1631214500004-ef1a3578af8d?w=600&q=80',
    eyes: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=600&q=80',
    lips: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2f20?w=600&q=80',
    nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600&q=80',
    skincare: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80',
    accessories: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
  }

  return (
    <div>
      {/* Hero */}
      <div style={{ marginTop: isMobile ? 104 : 110, background: 'linear-gradient(135deg,#fff0f4,#fde8ef 55%,#f5d5e2)', minHeight: isMobile ? 390 : 420, display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ position: 'absolute', right: lang === 'ar' ? 'auto' : 0, left: lang === 'ar' ? 0 : 'auto', top: 0, bottom: 0, width: isMobile ? '100%' : '44%', overflow: 'hidden', opacity: isMobile ? 0.28 : 1 }}>
          <img src={normalizeStoreSettings(settings).hero_image_url || DEFAULT_STORE_SETTINGS.hero_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.8 }} />
          <div style={{ position: 'absolute', inset: 0, background: lang === 'ar' ? 'linear-gradient(to left,#fff0f4,transparent)' : 'linear-gradient(to right,#fff0f4,transparent)' }} />
        </div>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '52px 22px' : '60px 40px', position: 'relative', zIndex: 2, width: '100%' }}>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, letterSpacing: 4, color: '#c8254e', textTransform: 'uppercase', marginBottom: 12, fontWeight: 700 }}>
            {lang === 'ar' ? 'مجموعة 2025' : 'Collection 2025'}
          </p>
          <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 42 : 52, fontWeight: 700, color: '#1a1a1a', margin: '0 0 16px', lineHeight: 1.1 }}>
            {storeText(settings, 'hero_title', lang, lang === 'ar' ? 'جمالك\nأسلوبك' : 'Votre beaute,\nvotre style')}
          </h1>
          <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: '#888', maxWidth: 360, lineHeight: 1.9, marginBottom: 28 }}>
            {storeText(settings, 'hero_subtitle', lang, lang === 'ar' ? 'منتجات مكياج فاخرة بأسعار في متناول الجميع. توصيل مجاني لكل ولايات تونس.' : 'Produits de maquillage premium a prix accessibles. Livraison gratuite dans toute la Tunisie.')}
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => navigate('face')} style={{ background: '#c8254e', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 30px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif", letterSpacing: 1 }}>
              {lang === 'ar' ? 'تسوقي الآن' : 'Découvrir →'}
            </button>
            <span style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: '#aaa', fontWeight: 600 }}>
              {storeText(settings, 'promotional_text', lang, lang === 'ar' ? 'دفع عند الاستلام' : 'Paiement a la livraison')}
            </span>
          </div>
        </div>
      </div>

      {/* Category cards */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '38px 16px 52px' : '48px 24px 60px' }}>
        <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, color: '#1a1a1a', marginBottom: 8, textAlign: 'center' }}>
          {lang === 'ar' ? 'تسوقي حسب الفئة' : 'Nos Catégories'}
        </h2>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 11, color: '#aaa', textAlign: 'center', marginBottom: 36, letterSpacing: 1 }}>
          {lang === 'ar' ? 'اختاري ما يناسبك' : 'Choisissez votre univers beauté'}
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
          {(categories.length ? categories : defaultCategories(t)).map(category => {
            const cat = category.slug
            const count = products.filter(p => p.category === cat).length
            return (
              <div key={cat} onClick={() => navigate(cat)} style={{ borderRadius: 14, overflow: 'hidden', cursor: 'pointer', position: 'relative', height: 200, boxShadow: '0 4px 20px rgba(0,0,0,0.08)', transition: 'transform 0.22s,box-shadow 0.22s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(200,37,78,0.18)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)' }}>
                <img src={getCategoryImage(category, cat, catImages[cat])} alt={getCategoryLabel(category, cat, lang, t)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(30,10,16,0.72),transparent 60%)' }} />
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '18px 20px', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, fontWeight: 700, color: '#fff' }}>{getCategoryLabel(category, cat, lang, t)}</div>
                  <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 4, letterSpacing: 1 }}>
                    {count} {lang === 'ar' ? 'منتج' : 'produits'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        {catalogLoading && <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 18 }}>Chargement...</p>}
        {catalogError && <p style={{ textAlign: 'center', color: '#c8254e', fontSize: 12, marginTop: 18 }}>{catalogError}</p>}
      </div>

      {products.some(product => product.isFeatured) && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 16px 52px' : '0 24px 64px' }}>
          <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, color: '#1a1a1a', marginBottom: 20, textAlign: 'center' }}>
            {lang === 'ar' ? 'منتجات مختارة' : 'Produits en vedette'}
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fill,minmax(200px,1fr))', gap: isMobile ? 12 : 18 }}>
            {products.filter(product => product.isFeatured).slice(0, 8).map(product => (
              <ProductCard key={product.id} product={product} t={t} lang={lang} setCart={setCart} onView={onViewProduct} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── CATEGORY PAGE ────────────────────────────────────────────────────────────
function CategoryPage({ lang, t, activeCat, navigate, cart, setCart, isMobile, products, categories, catalogLoading, catalogError, onViewProduct }) {
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('default')
  const category = categories.find(c => c.slug === activeCat)
  const meta = getCategoryMeta(category, activeCat, lang)
  const catImgMap = {
    face: 'https://images.unsplash.com/photo-1631214500004-ef1a3578af8d?w=1200&q=80',
    eyes: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?w=1200&q=80',
    lips: 'https://images.unsplash.com/photo-1586495777744-4e6232bf2f20?w=1200&q=80',
    nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=1200&q=80',
    skincare: 'https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=1200&q=80',
    accessories: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=1200&q=80',
  }

  let shownProducts = products.filter(p => p.category === activeCat && getName(p, lang).toLowerCase().includes(search.toLowerCase()))
  if (sort === 'priceAsc') shownProducts = [...shownProducts].sort((a, b) => a.price - b.price)
  if (sort === 'priceDesc') shownProducts = [...shownProducts].sort((a, b) => b.price - a.price)

  return (
    <div style={{ marginTop: isMobile ? 104 : 110 }}>
      {/* Hero banner */}
      <div style={{ position: 'relative', height: isMobile ? 220 : 260, overflow: 'hidden' }}>
        <img src={getCategoryImage(category, activeCat, catImgMap[activeCat])} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(200,37,78,0.78),rgba(100,10,30,0.42))' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '0 22px' : '0 40px', width: '100%', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
            <div style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 10, letterSpacing: 1 }}>
              <span onClick={() => navigate('home')} style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.3)' }}>
                {lang === 'ar' ? 'الرئيسية' : 'Accueil'}
              </span>
              {' / '}{getCategoryLabel(category, activeCat, lang, t)}
            </div>
            <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: isMobile ? 36 : 46, fontWeight: 700, color: '#fff', margin: '0 0 8px', lineHeight: 1 }}>
              {meta.hero}
            </h1>
            <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 13, color: 'rgba(255,255,255,0.82)', margin: 0 }}>
              {meta.sub}
            </p>
          </div>
        </div>
      </div>

      {/* Sub-cat pills */}
      <div style={{ borderBottom: '1px solid #f0e6ea', background: '#fdfaf9' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '12px 24px', display: 'flex', gap: 7, flexWrap: 'wrap', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
          {(categories.length ? categories : defaultCategories(t)).map(categoryItem => {
            const cat = categoryItem.slug
            return (
            <button key={cat} onClick={() => navigate(cat)} style={{ padding: '6px 15px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, fontFamily: "'Montserrat',sans-serif", letterSpacing: 1, textTransform: 'uppercase', background: activeCat === cat ? '#c8254e' : '#fff', color: activeCat === cat ? '#fff' : '#aaa', boxShadow: '0 1px 5px rgba(0,0,0,0.07)', transition: 'all 0.15s' }}>
              {getCategoryLabel(categoryItem, cat, lang, t)}
            </button>
          )})}
        </div>
      </div>

      {/* Grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: isMobile ? '22px 14px 52px' : '26px 24px 60px', direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 22, flexWrap: 'wrap' }}>
          <input placeholder={t.search} value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: '10px 14px', border: '1px solid #f0e6ea', borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 12, outline: 'none', direction: lang === 'ar' ? 'rtl' : 'ltr' }} />
          <select value={sort} onChange={e => setSort(e.target.value)}
            style={{ padding: '10px 14px', border: '1px solid #f0e6ea', borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 12, color: '#777', background: '#fff', cursor: 'pointer' }}>
            <option value="default">{t.sortBy}</option>
            <option value="priceAsc">{t.priceAsc}</option>
            <option value="priceDesc">{t.priceDesc}</option>
          </select>
        </div>
        <p style={{ fontFamily: "'Montserrat',sans-serif", fontSize: 10, color: '#ccc', marginBottom: 18, letterSpacing: 1, textTransform: 'uppercase' }}>
          {catalogLoading ? '...' : shownProducts.length} {t.items}
        </p>
        {catalogError && <p style={{ color: '#c8254e', fontSize: 12, marginBottom: 16 }}>{catalogError}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(auto-fill,minmax(200px,1fr))', gap: isMobile ? 12 : 18 }}>
          {shownProducts.map(p => <ProductCard key={p.id} product={p} t={t} lang={lang} setCart={setCart} onView={onViewProduct} />)}
        </div>
      </div>
    </div>
  )
}

// ─── CHECKOUT ─────────────────────────────────────────────────────────────────
function CheckoutPage({ lang, t, cart, setCart, navigate, isMobile, settings }) {
  const [form, setForm] = useState({ name: '', phone: '', governorate: '', city: '', address: '' })
  const [errors, setErrors] = useState({})
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submittedOrder, setSubmittedOrder] = useState(null)
  const [submitError, setSubmitError] = useState('')
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0)

  const validate = () => {
    const e = {}
    Object.keys(form).forEach(k => { if (!form[k].trim()) e[k] = true })
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async () => {
    if (!validate()) return
    setLoading(true)
    setSubmitError('')
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customer: form, items: cart }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Erreur. Veuillez réessayer.')
      setSubmittedOrder(data.order)
      const whatsappUrl = buildWhatsappOrderUrl(data.order, lang, t, settings)
      if (whatsappUrl) window.open(whatsappUrl, '_blank', 'noopener,noreferrer')
      setCart([])
      setDone(true)
      window.scrollTo(0, 0)
    } catch (err) {
      setSubmitError(err.message || 'Erreur. Veuillez réessayer.')
    } finally {
      setLoading(false)
    }
  }

  const inp = f => ({
    width: '100%', padding: '11px 14px',
    border: `1.5px solid ${errors[f] ? '#c8254e' : '#f0e6ea'}`,
    borderRadius: 8, fontFamily: "'Montserrat',sans-serif", fontSize: 13, outline: 'none',
    background: errors[f] ? '#fff8f9' : '#fff', boxSizing: 'border-box', direction: lang === 'ar' ? 'rtl' : 'ltr',
  })

  if (done) return (
    <div style={{ maxWidth: 460, margin: '140px auto 60px', textAlign: 'center', padding: isMobile ? '42px 24px' : '56px 36px', background: '#fff', borderRadius: 20, boxShadow: '0 8px 40px rgba(200,37,78,0.10)', fontFamily: "'Montserrat',sans-serif" }}>
      <div style={{ fontSize: 68, marginBottom: 14 }}>✅</div>
      <h2 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 30, color: '#c8254e', marginBottom: 10 }}>{t.orderSuccess}</h2>
      <p style={{ fontSize: 13, color: '#888', lineHeight: 1.9, marginBottom: 28 }}>{t.orderSuccessMsg}</p>
      {buildWhatsappOrderUrl(submittedOrder, lang, t, settings) && (
        <button onClick={() => window.open(buildWhatsappOrderUrl(submittedOrder, lang, t, settings), '_blank', 'noopener,noreferrer')} style={{ background: '#2ecc71', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 24px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif", marginBottom: 10, width: isMobile ? '100%' : 'auto' }}>
          WhatsApp
        </button>
      )}
      <button onClick={() => navigate('home')} style={{ background: '#c8254e', color: '#fff', border: 'none', borderRadius: 8, padding: '13px 32px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat',sans-serif", width: isMobile ? '100%' : 'auto' }}>
        {t.backToShop}
      </button>
    </div>
  )

  return (
    <div style={{ maxWidth: 940, margin: isMobile ? '124px auto 50px' : '130px auto 60px', padding: isMobile ? '0 14px' : '0 20px', direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: "'Montserrat',sans-serif" }}>
      <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 34, color: '#1a1a1a', marginBottom: 26 }}>{t.checkout}</h1>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 320px', gap: 22, alignItems: 'start' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: isMobile ? '20px' : '26px', boxShadow: '0 2px 18px rgba(200,37,78,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '11px 14px', background: '#f0faf4', borderRadius: 8, border: '1px solid #d5f0e0' }}>
            <span style={{ fontSize: 18 }}>💵</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#27ae60' }}>{storeText(settings, 'cod_text', lang, t.cod)}</span>
          </div>
          {[
            { k: 'name', label: t.fullName, ph: lang === 'ar' ? 'محمد بن علي' : 'Mohamed Ben Ali', type: 'text' },
            { k: 'phone', label: t.phone, ph: '+216 XX XXX XXX', type: 'tel' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 13 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 5, letterSpacing: 0.5, textTransform: 'uppercase' }}>{f.label}</label>
              <input type={f.type} placeholder={f.ph} value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} style={inp(f.k)} />
              {errors[f.k] && <p style={{ color: '#c8254e', fontSize: 10, marginTop: 3 }}>{t.required}</p>}
            </div>
          ))}
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 5, letterSpacing: 0.5, textTransform: 'uppercase' }}>{t.governorate}</label>
            <select value={form.governorate} onChange={e => setForm({ ...form, governorate: e.target.value })} style={{ ...inp('governorate'), appearance: 'auto' }}>
              <option value="">— {t.governorate} —</option>
              {GOVERNORATES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            {errors.governorate && <p style={{ color: '#c8254e', fontSize: 10, marginTop: 3 }}>{t.required}</p>}
          </div>
          {[
            { k: 'city', label: t.city, ph: lang === 'ar' ? 'المدينة' : 'Ville' },
            { k: 'address', label: t.address, ph: lang === 'ar' ? 'شارع، حي...' : 'Rue, Quartier...' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 13 }}>
              <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#999', marginBottom: 5, letterSpacing: 0.5, textTransform: 'uppercase' }}>{f.label}</label>
              <input placeholder={f.ph} value={form[f.k]} onChange={e => setForm({ ...form, [f.k]: e.target.value })} style={inp(f.k)} />
              {errors[f.k] && <p style={{ color: '#c8254e', fontSize: 10, marginTop: 3 }}>{t.required}</p>}
            </div>
          ))}
          {submitError && <p style={{ color: '#c8254e', fontSize: 12, lineHeight: 1.6, margin: '4px 0 12px' }}>{submitError}</p>}
          <button onClick={submit} disabled={loading} style={{ width: '100%', background: loading ? '#e8a0b0' : '#c8254e', color: '#fff', border: 'none', borderRadius: 10, padding: '14px', fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Montserrat',sans-serif", letterSpacing: 1, marginTop: 6 }}>
            {loading ? '⏳ ...' : `🛒 ${t.placeOrder}`}
          </button>
        </div>
        <div style={{ background: '#fff', borderRadius: 14, padding: isMobile ? '20px' : '26px', boxShadow: '0 2px 18px rgba(200,37,78,0.06)', position: isMobile ? 'static' : 'sticky', top: 125 }}>
          <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, marginBottom: 16, color: '#1a1a1a' }}>{t.orderSummary}</h3>
          {cart.map(item => (
            <div key={getCartItemKey(item)} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 9, fontSize: 12, color: '#666' }}>
              <span style={{ flex: 1, lineHeight: 1.4 }}>
                {getName(item, lang)} ×{item.qty}
                {item.shadeName && <span style={{ display: 'block', color: '#aaa', fontSize: 10 }}>{t.shade}: {item.shadeName}{item.sku ? ` · ${t.reference}: ${item.sku}` : ''}</span>}
              </span>
              <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmt(item.price * item.qty, t.tnd)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #f0e6ea', marginTop: 13, paddingTop: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 7, color: '#aaa' }}>
              <span>{t.delivery}</span><span style={{ color: '#2ecc71', fontWeight: 700 }}>{t.free} ✓</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#c8254e' }}>
              <span>{t.total}</span><span>{fmt(total, t.tnd)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ADMIN LOGIN ──────────────────────────────────────────────────────────────
function AdminLogin({ lang, t, onSuccess }) {
  const [pw, setPw] = useState('')
  const [err, setErr] = useState(false)
  const [loading, setLoading] = useState(false)

  const attempt = async () => {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      })
      const data = await res.json()
      if (!res.ok || !data.token) throw new Error(data.error || 'Invalid password')
      onSuccess(data.token)
    } catch (error) {
      setErr(true)
      setTimeout(() => setErr(false), 2000)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#fff0f4,#fde8ef)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat',sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '48px 40px', width: 340, boxShadow: '0 12px 48px rgba(200,37,78,0.12)', textAlign: 'center' }}>
        <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: '#c8254e', letterSpacing: 3, marginBottom: 4 }}>FLORMAR</div>
        <div style={{ fontSize: 9, color: '#ccc', letterSpacing: 3, marginBottom: 32 }}>ADMIN PANEL</div>
        <input
          type="password" placeholder={t.password} value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && attempt()}
          style={{ width: '100%', padding: '12px 16px', border: `1.5px solid ${err ? '#c8254e' : '#f0e6ea'}`, borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 12, textAlign: 'center', letterSpacing: 4, fontFamily: "'Montserrat',sans-serif", background: err ? '#fff8f9' : '#fff' }}
        />
        {err && <p style={{ color: '#c8254e', fontSize: 11, marginBottom: 12 }}>{t.wrongPassword}</p>}
        <button onClick={attempt} disabled={loading} style={{ width: '100%', background: loading ? '#e8a0b0' : '#c8254e', color: '#fff', border: 'none', borderRadius: 8, padding: '13px', fontSize: 13, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
          {loading ? '...' : t.loginBtn}
        </button>
      </div>
    </div>
  )
}

function emptyProductForm(categories) {
  return {
    id: '',
    category: categories[0]?.slug || 'face',
    name_fr: '',
    name_ar: '',
    price: '',
    stock_quantity: 0,
    image_url: '',
    tag: '',
    is_active: true,
  }
}

function emptyVariantForm(productId = '') {
  return {
    id: '',
    product_id: productId,
    shade_name: '',
    sku: '',
    color_hex: '',
    image_url: '',
    price: '',
    stock_quantity: 0,
    is_active: true,
    display_order: 0,
  }
}

function ProductManager({ lang, t, products, categories, adminFetch, reload, setError, isMobile }) {
  const [form, setForm] = useState(() => emptyProductForm(categories))
  const [variantProductId, setVariantProductId] = useState('')
  const [variantForm, setVariantForm] = useState(() => emptyVariantForm(''))
  const [saving, setSaving] = useState(false)
  const [variantSaving, setVariantSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [variantUploading, setVariantUploading] = useState(false)

  useEffect(() => {
    if (!form.category && categories[0]?.slug) {
      setForm(prev => ({ ...prev, category: categories[0].slug }))
    }
  }, [categories])

  useEffect(() => {
    if (!variantProductId && products[0]?.id) {
      const firstProductId = String(products[0].id)
      setVariantProductId(firstProductId)
      setVariantForm(prev => ({ ...prev, product_id: firstProductId }))
    }
  }, [products, variantProductId])

  const editProduct = product => {
    setForm({
      id: product.id,
      category: product.category || categories[0]?.slug || 'face',
      name_fr: product.nameFr || '',
      name_ar: product.nameAr || '',
      price: product.price || '',
      stock_quantity: product.stockQuantity || 0,
      image_url: product.image || '',
      tag: product.tag || '',
      is_active: product.isActive !== false,
    })
    setVariantProductId(String(product.id))
    setVariantForm(emptyVariantForm(String(product.id)))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const saveProduct = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossible de sauvegarder le produit.')
      setForm(emptyProductForm(categories))
      await reload()
    } catch (error) {
      setError(error.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async id => {
    if (!window.confirm(lang === 'ar' ? 'حذف هذا المنتج؟' : 'Supprimer ce produit?')) return
    setError('')
    const res = await adminFetch(`/api/admin-products?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data.error || 'Impossible de supprimer le produit.')
    reload()
  }

  const uploadImage = (file, target = 'product') => {
    if (!file) return
    const setUploadState = target === 'variant' ? setVariantUploading : setUploading
    setUploadState(true)
    setError('')
    const reader = new FileReader()
    reader.onload = async () => {
      try {
        const res = await adminFetch('/api/admin-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            contentType: file.type,
            data: reader.result,
          }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || 'Impossible d’uploader l’image.')
        if (target === 'variant') {
          setVariantForm(prev => ({ ...prev, image_url: data.url }))
        } else {
          setForm(prev => ({ ...prev, image_url: data.url }))
        }
      } catch (error) {
        setError(error.message)
      } finally {
        setUploadState(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const selectedVariantProduct = products.find(product => String(product.id) === String(variantProductId)) || products[0]
  const selectedVariants = selectedVariantProduct?.variants || []

  const selectVariantProduct = productId => {
    const nextId = String(productId || '')
    setVariantProductId(nextId)
    setVariantForm(emptyVariantForm(nextId))
  }

  const editVariant = variant => {
    setVariantProductId(String(variant.productId))
    setVariantForm({
      id: variant.id,
      product_id: variant.productId,
      shade_name: variant.shadeName || '',
      sku: variant.sku || '',
      color_hex: variant.colorHex || '',
      image_url: variant.image || '',
      price: variant.price === null ? '' : variant.price,
      stock_quantity: variant.stockQuantity || 0,
      is_active: variant.isActive !== false,
      display_order: variant.displayOrder || 0,
    })
  }

  const saveVariant = async () => {
    setVariantSaving(true)
    setError('')
    try {
      const payload = { ...variantForm, product_id: variantProductId || variantForm.product_id }
      const res = await adminFetch('/api/admin-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Impossible de sauvegarder la teinte.')
      const productId = String(payload.product_id)
      setVariantProductId(productId)
      setVariantForm(emptyVariantForm(productId))
      await reload()
    } catch (error) {
      setError(error.message)
    } finally {
      setVariantSaving(false)
    }
  }

  const deleteVariant = async id => {
    if (!window.confirm(lang === 'ar' ? 'حذف هذا اللون؟' : 'Supprimer cette teinte?')) return
    setError('')
    const res = await adminFetch(`/api/admin-variants?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return setError(data.error || 'Impossible de supprimer la teinte.')
    setVariantForm(emptyVariantForm(variantProductId))
    reload()
  }

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 10, padding: isMobile ? 14 : 18, marginBottom: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#1a1a1a' }}>
            {form.id ? t.editProduct : t.newProduct}
          </h3>
          {form.id && (
            <button onClick={() => setForm(emptyProductForm(categories))} style={{ border: '1px solid #f0e6ea', background: '#fff', color: '#999', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 11 }}>
              {t.newProduct}
            </button>
          )}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
          <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.category}
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6 }}>
              {categories.map(category => <option key={category.slug} value={category.slug}>{getCategoryLabel(category, category.slug, lang, t)}</option>)}
            </select>
          </label>
          <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.productNameFr}
            <input value={form.name_fr} onChange={e => setForm({ ...form, name_fr: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.productNameAr}
            <input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.price}
            <input type="number" step="0.001" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.stock}
            <input type="number" min="0" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
          </label>
          <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.tag}
            <select value={form.tag} onChange={e => setForm({ ...form, tag: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6 }}>
              <option value="">-</option>
              <option value="new">new</option>
              <option value="bestseller">bestseller</option>
            </select>
          </label>
        </div>
        <label style={{ display: 'block', fontSize: 10, color: '#999', fontWeight: 700, marginTop: 12 }}>{t.imageUrl}
          <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
          <label style={{ border: '1px solid #f0e6ea', borderRadius: 6, padding: '9px 12px', color: '#c8254e', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            {uploading ? '...' : t.uploadImage}
            <input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0])} style={{ display: 'none' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#777', fontSize: 12 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm({ ...form, is_active: e.target.checked })} />
            {form.is_active ? t.active : t.inactive}
          </label>
          <button onClick={saveProduct} disabled={saving} style={{ marginLeft: 'auto', background: saving ? '#e8a0b0' : '#c8254e', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12 }}>
            {saving ? '...' : t.saveProduct}
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 10, padding: isMobile ? 14 : 18, marginBottom: 18, boxShadow: '0 1px 6px rgba(0,0,0,0.05)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#1a1a1a' }}>
            {t.variants}
          </h3>
          <button onClick={() => setVariantForm(emptyVariantForm(variantProductId || selectedVariantProduct?.id || ''))} style={{ border: '1px solid #f0e6ea', background: '#fff', color: '#999', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 11 }}>
            {t.addVariant}
          </button>
        </div>
        {products.length === 0 ? (
          <div style={{ color: '#bbb', fontSize: 12 }}>{t.noProducts}</div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: 10, color: '#999', fontWeight: 700, marginBottom: 12 }}>{t.products}
              <select value={variantProductId || selectedVariantProduct?.id || ''} onChange={e => selectVariantProduct(e.target.value)} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6 }}>
                {products.map(product => <option key={product.id} value={product.id}>{getName(product, lang)}</option>)}
              </select>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 12 }}>
              <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.shade}
                <input value={variantForm.shade_name} onChange={e => setVariantForm({ ...variantForm, shade_name: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.reference}
                <input value={variantForm.sku} onChange={e => setVariantForm({ ...variantForm, sku: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.colorHex}
                <input placeholder="#c8254e" value={variantForm.color_hex} onChange={e => setVariantForm({ ...variantForm, color_hex: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.stock}
                <input type="number" min="0" value={variantForm.stock_quantity} onChange={e => setVariantForm({ ...variantForm, stock_quantity: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.variantPrice}
                <input type="number" step="0.001" placeholder={fmt(selectedVariantProduct?.price || 0, t.tnd)} value={variantForm.price} onChange={e => setVariantForm({ ...variantForm, price: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
              </label>
              <label style={{ fontSize: 10, color: '#999', fontWeight: 700 }}>{t.variantImage}
                <input value={variantForm.image_url} onChange={e => setVariantForm({ ...variantForm, image_url: e.target.value })} style={{ width: '100%', marginTop: 5, padding: 10, border: '1px solid #f0e6ea', borderRadius: 6, boxSizing: 'border-box' }} />
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 14 }}>
              <label style={{ border: '1px solid #f0e6ea', borderRadius: 6, padding: '9px 12px', color: '#c8254e', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                {variantUploading ? '...' : t.uploadImage}
                <input type="file" accept="image/*" onChange={e => uploadImage(e.target.files?.[0], 'variant')} style={{ display: 'none' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, color: '#777', fontSize: 12 }}>
                <input type="checkbox" checked={variantForm.is_active} onChange={e => setVariantForm({ ...variantForm, is_active: e.target.checked })} />
                {variantForm.is_active ? t.active : t.inactive}
              </label>
              <button onClick={saveVariant} disabled={variantSaving || !variantProductId} style={{ marginLeft: 'auto', background: variantSaving ? '#e8a0b0' : '#c8254e', color: '#fff', border: 'none', borderRadius: 6, padding: '10px 18px', cursor: variantSaving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 12 }}>
                {variantSaving ? '...' : t.saveVariant}
              </button>
            </div>
            <div style={{ marginTop: 16, display: 'grid', gap: 8 }}>
              {selectedVariants.length === 0 ? (
                <div style={{ color: '#bbb', fontSize: 12, padding: '10px 0' }}>{t.addVariant}</div>
              ) : selectedVariants.map(variant => (
                <div key={variant.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 10, alignItems: 'center', border: '1px solid #f8f0f3', borderRadius: 8, padding: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <span style={{ width: 18, height: 18, borderRadius: '50%', background: variant.colorHex || '#f8f0f3', border: '1px solid #e8dce0', flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#333' }}>{variant.shadeName}</div>
                      <div style={{ fontSize: 10, color: '#999', marginTop: 3 }}>
                        {t.reference}: {variant.sku || '-'} · {t.stock}: {variant.stockQuantity} · {variant.price === null ? t.basePrice : fmt(variant.price, t.tnd)} · {variant.isActive ? t.active : t.inactive}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => editVariant(variant)} style={{ border: 'none', background: '#3498db', color: '#fff', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      {t.editVariant}
                    </button>
                    <button onClick={() => deleteVariant(variant.id)} style={{ border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                      {t.deleteVariant}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 50, color: '#bbb' }}>{t.noProducts}</div>
      ) : products.map(product => (
        <div key={product.id} style={{ background: '#fff', borderRadius: 10, padding: 14, marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'grid', gridTemplateColumns: isMobile ? '64px 1fr' : '70px 1fr auto', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 64, height: 64, background: '#f8f0f3', borderRadius: 8, overflow: 'hidden' }}>
            {product.image && <img src={product.image} alt="" onError={e => { e.currentTarget.style.display = 'none' }} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1a1a' }}>{getName(product, lang)}</div>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
              {product.category} · {fmt(product.price, t.tnd)} · {t.stock}: {product.stockQuantity} · {(product.variants || []).length} {t.variants} · {product.isActive ? t.active : t.inactive}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, gridColumn: isMobile ? '1 / -1' : 'auto' }}>
            <button onClick={() => { selectVariantProduct(product.id); window.scrollTo({ top: 0, behavior: 'smooth' }) }} style={{ border: '1px solid #f0e6ea', background: '#fff', color: '#c8254e', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              {t.variants}
            </button>
            <button onClick={() => editProduct(product)} style={{ border: 'none', background: '#3498db', color: '#fff', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              {t.editProduct}
            </button>
            <button onClick={() => deleteProduct(product.id)} style={{ border: '1px solid #e74c3c', background: '#fff', color: '#e74c3c', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
              {t.deleteProduct}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── ADMIN DASHBOARD ──────────────────────────────────────────────────────────
function AdminDashboard({ lang, t, onLogout, token, onAuthError, isMobile }) {
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(DEFAULT_STORE_SETTINGS)
  const [filter, setFilter] = useState('all')
  const [tab, setTab] = useState('orders')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [colleague, setColleague] = useState('')

  const adminFetch = (url, options = {}) => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const load = async () => {
    if (!token) return onAuthError()
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin-dashboard')
      if (res.status === 401) return onAuthError()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setOrders([])
        setProducts([])
        setError(data.error || 'Impossible de charger les commandes.')
      } else {
        setOrders(data.orders || [])
        setProducts(data.products || [])
        setCategories(data.categories || [])
      }
    } catch (e) {
      console.error(e)
      setError('Impossible de contacter le serveur admin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(load, 30000) // auto-refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const updateStatus = async (id, status) => {
    const res = await adminFetch('/api/admin-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    })
    if (res.status === 401) return onAuthError()
    load()
  }

  const assignOrder = async (id, assigned_to) => {
    const res = await adminFetch('/api/admin-orders', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, assigned_to }),
    })
    if (res.status === 401) return onAuthError()
    load()
  }

  const SC = { pending: '#f39c12', confirmed: '#3498db', delivered: '#2ecc71', cancelled: '#e74c3c' }
  const SL = { pending: t.pending, confirmed: t.confirmed, delivered: t.delivered, cancelled: t.cancelled }
  const shown = filter === 'all' ? orders : orders.filter(o => o.status === filter)
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    revenue: orders.filter(o => o.status !== 'cancelled').reduce((s, o) => s + Number(o.total), 0),
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f0f3', direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: "'Montserrat',sans-serif" }}>
      <div style={{ background: '#1a1a1a', padding: isMobile ? '12px 14px' : '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 22, color: '#c8254e', letterSpacing: 3 }}>FLORMAR</span>
          <span style={{ fontSize: 9, color: '#555', letterSpacing: 3 }}>ADMIN</span>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={load} style={{ background: '#2a2a2a', color: '#aaa', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 11 }}>
            🔄 {lang === 'ar' ? 'تحديث' : 'Actualiser'}
          </button>
          <button onClick={onLogout} style={{ background: '#c8254e', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 16px', cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
            {t.logout}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 12px' : '26px 20px' }}>
        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(5,1fr)', gap: 12, marginBottom: 26 }}>
          {[
            { label: t.orders, value: stats.total, icon: '📦', color: '#3498db' },
            { label: t.pending, value: stats.pending, icon: '⏳', color: '#f39c12' },
            { label: t.confirmed, value: stats.confirmed, icon: '✅', color: '#3498db' },
            { label: t.delivered, value: stats.delivered, icon: '🚚', color: '#2ecc71' },
            { label: t.revenue, value: `${stats.revenue.toFixed(3)} ${t.tnd}`, icon: '💰', color: '#c8254e' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '16px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: 20, marginBottom: 5 }}>{s.icon}</div>
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 19, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 9, color: '#bbb', letterSpacing: 1, textTransform: 'uppercase', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
          {[
            { key: 'orders', label: t.orders },
            { key: 'products', label: t.products },
          ].map(item => (
            <button key={item.key} onClick={() => setTab(item.key)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', background: tab === item.key ? '#c8254e' : '#fff', color: tab === item.key ? '#fff' : '#888', fontSize: 11, fontWeight: 700, boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              {item.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ background: '#fff8f9', border: '1px solid #f3c2cf', borderRadius: 10, padding: '14px 16px', marginBottom: 16, color: '#c8254e', fontSize: 12, lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {tab === 'products' ? (
          <ProductManager lang={lang} t={t} products={products} categories={categories} adminFetch={adminFetch} reload={load} setError={setError} isMobile={isMobile} />
        ) : (
          <>
        {/* Colleague filter input */}
        <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, boxShadow: '0 1px 6px rgba(0,0,0,0.05)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexDirection: isMobile ? 'column' : 'row' }}>
          <span style={{ fontSize: 11, color: '#888', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
            👤 {lang === 'ar' ? 'أنت:' : 'Vous êtes:'}
          </span>
          <input value={colleague} onChange={e => setColleague(e.target.value)} placeholder={lang === 'ar' ? 'اسمك (للتعيين)' : 'Votre nom (pour attribution)'}
            style={{ flex: 1, padding: '8px 12px', border: '1px solid #f0e6ea', borderRadius: 6, fontSize: 12, outline: 'none', fontFamily: "'Montserrat',sans-serif" }} />
          <span style={{ fontSize: 11, color: '#bbb' }}>
            {lang === 'ar' ? 'سيُستخدم عند تعيين الطلبات' : 'Utilisé pour attribuer les commandes'}
          </span>
        </div>

        {/* Status filters */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 18, flexWrap: 'wrap' }}>
          {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', background: filter === s ? '#c8254e' : '#fff', color: filter === s ? '#fff' : '#888', fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', boxShadow: '0 1px 4px rgba(0,0,0,0.07)' }}>
              {s === 'all' ? (lang === 'ar' ? 'الكل' : 'Tous') : SL[s]}
              {s !== 'all' && <span style={{ marginLeft: 5, background: 'rgba(255,255,255,0.3)', borderRadius: 10, padding: '1px 6px', fontSize: 9 }}>
                {orders.filter(o => o.status === s).length}
              </span>}
            </button>
          ))}
        </div>

        {/* Orders */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px', color: '#ccc' }}>⏳ {lang === 'ar' ? 'جاري التحميل...' : 'Chargement...'}</div>
        ) : shown.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '70px', color: '#ccc' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>📭</div>{t.noOrders}
          </div>
        ) : shown.map(order => (
          <div key={order.id} style={{ background: '#fff', borderRadius: 11, padding: '20px', marginBottom: 11, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `3px solid ${SC[order.status]}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 13, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{t.orderId}{String(order.id).slice(-6)}</div>
                <div style={{ fontSize: 10, color: '#ccc', marginTop: 2 }}>{new Date(order.created_at).toLocaleString(lang === 'ar' ? 'ar-TN' : 'fr-TN')}</div>
                {order.assigned_to && (
                  <div style={{ fontSize: 10, color: '#3498db', marginTop: 2, fontWeight: 600 }}>
                    👤 {lang === 'ar' ? 'مُعيَّن لـ:' : 'Attribué à:'} {order.assigned_to}
                  </div>
                )}
              </div>
              <span style={{ padding: '3px 12px', borderRadius: 20, background: `${SC[order.status]}22`, color: SC[order.status], fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
                {SL[order.status]}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 13 }}>
              <div style={{ background: '#fdfaf9', borderRadius: 8, padding: '12px' }}>
                <p style={{ fontSize: 9, color: '#ccc', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t.customerInfo}</p>
                <p style={{ fontSize: 13, fontWeight: 700, margin: '0 0 3px' }}>{order.customer_name}</p>
                <p style={{ fontSize: 12, color: '#2ecc71', margin: '0 0 2px', fontWeight: 700 }}>📞 {order.customer_phone}</p>
                <p style={{ fontSize: 12, color: '#666', margin: '0 0 2px' }}>📍 {order.governorate}, {order.city}</p>
                <p style={{ fontSize: 11, color: '#999', margin: 0 }}>{order.address}</p>
              </div>
              <div style={{ background: '#fdfaf9', borderRadius: 8, padding: '12px' }}>
                <p style={{ fontSize: 9, color: '#ccc', marginBottom: 6, letterSpacing: 1, textTransform: 'uppercase' }}>{t.products}</p>
                {(order.items || []).map((item, i) => (
                  <p key={i} style={{ fontSize: 12, color: '#555', margin: '0 0 3px' }}>
                    {getName(item, lang)} ×{item.qty} — {fmt(item.price * item.qty, t.tnd)}
                    {item.shadeName && <span style={{ display: 'block', color: '#999', fontSize: 10, marginTop: 2 }}>{t.shade}: {item.shadeName}{item.sku ? ` · ${t.reference}: ${item.sku}` : ''}</span>}
                  </p>
                ))}
                <p style={{ fontSize: 14, fontWeight: 700, color: '#c8254e', marginTop: 8 }}>
                  {t.total}: {fmt(order.total, t.tnd)}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
              {order.status === 'pending' && (
                <button onClick={() => updateStatus(order.id, 'confirmed')} style={{ padding: '7px 14px', background: '#3498db', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  ✅ {t.markConfirmed}
                </button>
              )}
              {order.status === 'confirmed' && (
                <button onClick={() => updateStatus(order.id, 'delivered')} style={{ padding: '7px 14px', background: '#2ecc71', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  🚚 {t.markDelivered}
                </button>
              )}
              {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <button onClick={() => updateStatus(order.id, 'cancelled')} style={{ padding: '7px 14px', background: '#fff', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  ✕ {t.cancelled}
                </button>
              )}
              {colleague && !order.assigned_to && order.status === 'pending' && (
                <button onClick={() => assignOrder(order.id, colleague)} style={{ padding: '7px 14px', background: '#f8f0f3', color: '#c8254e', border: '1px solid #f0e6ea', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700 }}>
                  👤 {lang === 'ar' ? 'تعيين لي' : 'M\'attribuer'}
                </button>
              )}
            </div>
          </div>
        ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── FOOTER ───────────────────────────────────────────────────────────────────
function Footer({ lang, t, navigate, isMobile, categories, settings }) {
  const footerCategories = categories.length ? categories : defaultCategories(t)
  const safeSettings = normalizeStoreSettings(settings)
  const phone = safeSettings.phone || safeSettings.whatsapp_number || process.env.NEXT_PUBLIC_WHATSAPP || 'WhatsApp'
  const socialLinkStyle = { display: 'block', fontSize: 12, color: '#666', marginBottom: 7, textDecoration: 'none' }
  return (
    <footer style={{ background: '#1a1a1a', color: '#fff', padding: isMobile ? '34px 22px 18px' : '40px 40px 18px', marginTop: 60, direction: lang === 'ar' ? 'rtl' : 'ltr', fontFamily: "'Montserrat',sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: isMobile ? 24 : 36, marginBottom: 32 }}>
          <div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: '#c8254e', letterSpacing: 3, marginBottom: 10 }}>{safeSettings.store_name || 'FLORMAR'}</div>
            <p style={{ fontSize: 12, color: '#666', lineHeight: 1.9, maxWidth: 260, display: 'none' }}>
              {lang === 'ar' ? 'جمال بلا حدود. توصيل مجاني لكل ولايات تونس. الدفع عند الاستلام.' : 'Beauté sans frontières. Livraison gratuite en Tunisie. Paiement à la livraison.'}
            </p>
            <p style={{ fontSize: 12, color: '#666', lineHeight: 1.9, maxWidth: 260 }}>
              {storeText(settings, 'footer_text', lang, 'Beaute sans frontieres. Livraison gratuite en Tunisie. Paiement a la livraison.')}
            </p>
          </div>
          <div>
            <h4 style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#c8254e', marginBottom: 13 }}>{lang === 'ar' ? 'الفئات' : 'Catégories'}</h4>
            {footerCategories.map(category => (
              <p key={category.slug} onClick={() => navigate(category.slug)} style={{ fontSize: 12, color: '#666', marginBottom: 7, cursor: 'pointer' }}
                onMouseEnter={e => e.target.style.color = '#c8254e'} onMouseLeave={e => e.target.style.color = '#666'}>
                {getCategoryLabel(category, category.slug, lang, t)}
              </p>
            ))}
          </div>
          <div>
            <h4 style={{ fontSize: 9, letterSpacing: 2, textTransform: 'uppercase', color: '#c8254e', marginBottom: 13 }}>Contact</h4>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 7 }}>📍 Tunisie</p>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 7 }}>{phone}</p>
            {safeSettings.instagram_url && <a href={normalizeExternalUrl(safeSettings.instagram_url)} target="_blank" rel="noreferrer" style={socialLinkStyle}>Instagram</a>}
            {safeSettings.facebook_url && <a href={normalizeExternalUrl(safeSettings.facebook_url)} target="_blank" rel="noreferrer" style={socialLinkStyle}>Facebook</a>}
            {safeSettings.tiktok_url && <a href={normalizeExternalUrl(safeSettings.tiktok_url)} target="_blank" rel="noreferrer" style={{ ...socialLinkStyle, marginBottom: 0 }}>TikTok</a>}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: 16, textAlign: 'center', fontSize: 10, color: '#444' }}>
          © 2026 {safeSettings.store_name || 'Flormar Tunisie'}.
        </div>
      </div>
    </footer>
  )
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState('fr')
  const [page, setPage] = useState('home')
  const [activeCat, setActiveCat] = useState('face')
  const [cart, setCart] = useState([])
  const [adminToken, setAdminToken] = useState('')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(DEFAULT_STORE_SETTINGS)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const isMobile = useIsMobile()
  const t = T[lang]
  const selectedProduct = products.find(product => String(product.id) === String(selectedProductId)) || null

  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Montserrat:wght@400;600;700&display=swap'
    document.head.appendChild(link)
  }, [])

  useEffect(() => {
    const storedToken = localStorage.getItem(ADMIN_TOKEN_KEY) || ''
    setAdminToken(storedToken)
    if (window.location.hash === '#admin') {
      setPage(storedToken ? 'admin-dashboard' : 'admin-login')
    }
  }, [])

  useEffect(() => {
    const loadCatalog = async () => {
      setCatalogLoading(true)
      setCatalogError('')
      try {
        const res = await fetch('/api/products')
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data.error || t.loadError)
        setProducts(data.products || [])
        setCategories(data.categories || [])
        setSettings(normalizeStoreSettings(data.settings || {}))
        if ((data.categories || []).length && !data.categories.some(category => category.slug === activeCat)) {
          setActiveCat(data.categories[0].slug)
        }
      } catch (error) {
        setCatalogError(error.message || t.loadError)
      } finally {
        setCatalogLoading(false)
      }
    }

    loadCatalog()
  }, [])

  const navigate = (dest) => {
    if (window.location.hash) window.history.pushState('', document.title, window.location.pathname + window.location.search)
    setSelectedProductId('')
    if (dest === 'home') { setPage('home') }
    else { setActiveCat(dest); setPage('category') }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openProduct = (product) => {
    if (!product) return
    if (window.location.hash) window.history.pushState('', document.title, window.location.pathname + window.location.search)
    setSelectedProductId(product.id)
    if (product.category) setActiveCat(product.category)
    setPage('product')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleAdminLogin = (token) => {
    localStorage.setItem(ADMIN_TOKEN_KEY, token)
    setAdminToken(token)
    window.history.pushState('', document.title, '#admin')
    setPage('admin-dashboard')
  }

  const handleAdminLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken('')
    if (window.location.hash) window.history.pushState('', document.title, window.location.pathname + window.location.search)
    setPage('home')
  }

  const handleAdminAuthError = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY)
    setAdminToken('')
    setPage('admin-login')
  }

  const openAdmin = () => {
    window.history.pushState('', document.title, '#admin')
    setPage(adminToken ? 'admin-dashboard' : 'admin-login')
  }

  if (page === 'admin-login') {
    if (adminToken) return <ProfessionalAdminDashboard lang={lang} t={t} token={adminToken} onLogout={handleAdminLogout} onAuthError={handleAdminAuthError} isMobile={isMobile} />
    return <AdminLogin lang={lang} t={t} onSuccess={handleAdminLogin} />
  }
  if (page === 'admin-dashboard') {
    if (!adminToken) return <AdminLogin lang={lang} t={t} onSuccess={handleAdminLogin} />
    return <ProfessionalAdminDashboard lang={lang} t={t} token={adminToken} onLogout={handleAdminLogout} onAuthError={handleAdminAuthError} isMobile={isMobile} />
  }

  return (
    <>
      <Head>
        <title>Flormar Tunisie – Maquillage & Soins</title>
        <meta name="description" content="Boutique officielle Flormar Tunisie. Livraison gratuite, paiement à la livraison." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#fdfaf9' }}>
        <Header lang={lang} setLang={setLang} t={t} cart={cart} setCart={setCart} activeCat={activeCat} navigate={navigate} setPage={setPage} openAdmin={openAdmin} isMobile={isMobile} categories={categories} settings={settings} />
        {page === 'home' && <HomePage lang={lang} t={t} navigate={navigate} setCart={setCart} isMobile={isMobile} products={products} categories={categories} catalogLoading={catalogLoading} catalogError={catalogError} settings={settings} onViewProduct={openProduct} />}
        {page === 'category' && <CategoryPage lang={lang} t={t} activeCat={activeCat} navigate={navigate} cart={cart} setCart={setCart} isMobile={isMobile} products={products} categories={categories} catalogLoading={catalogLoading} catalogError={catalogError} onViewProduct={openProduct} />}
        {page === 'product' && <ProductDetailPage product={selectedProduct} lang={lang} t={t} navigate={navigate} setCart={setCart} isMobile={isMobile} categories={categories} />}
        {page === 'checkout' && <CheckoutPage lang={lang} t={t} cart={cart} setCart={setCart} navigate={navigate} isMobile={isMobile} settings={settings} />}
        {(page === 'home' || page === 'category' || page === 'product') && <Footer lang={lang} t={t} navigate={navigate} isMobile={isMobile} categories={categories} settings={settings} />}
      </div>
    </>
  )
}
