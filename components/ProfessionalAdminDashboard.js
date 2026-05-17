import { useEffect, useMemo, useState } from 'react'
import { fmt, getName } from '../lib/data'

const ADMIN_SECTIONS = [
  { key: 'home', label: 'Dashboard' },
  { key: 'orders', label: 'Orders' },
  { key: 'products', label: 'Products' },
  { key: 'variants', label: 'Variants' },
  { key: 'categories', label: 'Categories' },
  { key: 'content', label: 'Homepage' },
  { key: 'settings', label: 'Settings' },
]

const DEFAULT_SETTINGS = {
  store_name: 'Flormar Tunisie',
  hero_title_fr: 'Votre beaute, votre style',
  hero_title_ar: '',
  hero_subtitle_fr: 'Produits de maquillage premium a prix accessibles. Livraison gratuite dans toute la Tunisie.',
  hero_subtitle_ar: '',
  hero_image_url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=900&q=80',
  announcement_fr: 'Livraison gratuite - Paiement a la livraison',
  announcement_ar: '',
  promotional_text_fr: 'Paiement a la livraison',
  promotional_text_ar: '',
  delivery_message_fr: 'Livraison gratuite',
  delivery_message_ar: '',
  currency_label: 'TND',
  cod_text_fr: 'Paiement a la livraison',
  cod_text_ar: '',
  footer_text_fr: 'Tous droits reserves.',
  footer_text_ar: '',
  phone: '',
  whatsapp_number: '',
  instagram_url: 'https://www.instagram.com/flormar_tunisie/',
  facebook_url: '',
  tiktok_url: '',
}

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const STATUS_COLORS = {
  pending: '#f39c12',
  confirmed: '#3498db',
  delivered: '#2ecc71',
  cancelled: '#e74c3c',
}

const fieldStyle = {
  display: 'block',
  fontSize: 10,
  color: '#7b6870',
  fontWeight: 800,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
}

const inputStyle = {
  width: '100%',
  marginTop: 6,
  padding: '10px 11px',
  border: '1px solid #eadde2',
  borderRadius: 8,
  fontFamily: "'Montserrat',sans-serif",
  fontSize: 12,
  color: '#2a2024',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
}

const panelStyle = {
  background: '#fff',
  border: '1px solid #f0e6ea',
  borderRadius: 10,
  boxShadow: '0 8px 26px rgba(41,24,31,0.05)',
}

function normalizeSettings(settings = {}) {
  return { ...DEFAULT_SETTINGS, ...(settings || {}) }
}

function phoneDigits(value = '') {
  const digits = String(value || '').replace(/\D/g, '')
  if (digits.length === 8) return `216${digits}`
  return digits
}

function emptyProductForm(categories = []) {
  return {
    id: null,
    category: categories[0]?.slug || 'face',
    slug: '',
    sku: '',
    name_fr: '',
    name_ar: '',
    description_fr: '',
    description_ar: '',
    price: '',
    sale_price: '',
    stock_quantity: 0,
    image_url: '',
    tag: '',
    is_active: true,
    is_featured: false,
    display_order: 0,
  }
}

function emptyVariantForm(productId = '') {
  return {
    id: null,
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

function emptyCategoryForm() {
  return {
    id: '',
    slug: '',
    name_fr: '',
    name_ar: '',
    hero_fr: '',
    hero_ar: '',
    description_fr: '',
    description_ar: '',
    image_url: '',
    display_order: 0,
    is_active: true,
  }
}

function productFinalPrice(product) {
  const sale = product.salePrice
  return sale !== null && sale !== undefined && Number(sale) > 0 ? Number(sale) : Number(product.price || 0)
}

function productLowStock(product) {
  const variants = product.variants || []
  if (variants.length) return variants.some(variant => variant.isActive !== false && Number(variant.stockQuantity || 0) <= 5)
  return Number(product.stockQuantity || 0) <= 5
}

function Grid({ children, columns = 2, isMobile }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${columns}, minmax(0,1fr))`, gap: 12 }}>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={fieldStyle}>
      {label}
      {children}
    </label>
  )
}

function Panel({ title, subtitle, action, children, style }) {
  return (
    <section style={{ ...panelStyle, padding: 18, ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, color: '#24191e', fontSize: 17, fontWeight: 800 }}>{title}</h2>
          {subtitle && <p style={{ margin: '5px 0 0', color: '#9b8b92', fontSize: 12, lineHeight: 1.6 }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Button({ children, onClick, variant = 'primary', disabled, type = 'button', style }) {
  const palette = {
    primary: { background: '#c8254e', color: '#fff', border: '1px solid #c8254e' },
    neutral: { background: '#fff', color: '#49363d', border: '1px solid #eadde2' },
    danger: { background: '#fff', color: '#d94040', border: '1px solid #f0b9b9' },
    success: { background: '#2ecc71', color: '#fff', border: '1px solid #2ecc71' },
    info: { background: '#3498db', color: '#fff', border: '1px solid #3498db' },
  }[variant]

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        ...palette,
        borderRadius: 8,
        padding: '9px 13px',
        fontSize: 11,
        fontWeight: 800,
        fontFamily: "'Montserrat',sans-serif",
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function ImagePreview({ src, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
      <div style={{ width: 54, height: 54, borderRadius: 9, overflow: 'hidden', background: '#f8f0f3', border: '1px solid #eadde2', flexShrink: 0 }}>
        {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
      </div>
      <span style={{ color: '#9b8b92', fontSize: 11, lineHeight: 1.5 }}>{label || 'Image preview'}</span>
    </div>
  )
}

function UploadButton({ label, uploading, onFile }) {
  return (
    <label style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: '1px solid #eadde2',
      background: '#fff',
      color: '#c8254e',
      borderRadius: 8,
      padding: '9px 13px',
      fontSize: 11,
      fontWeight: 800,
      cursor: uploading ? 'wait' : 'pointer',
      opacity: uploading ? 0.7 : 1,
    }}>
      {uploading ? 'Uploading...' : label}
      <input type="file" accept="image/*" onChange={event => onFile(event.target.files?.[0])} style={{ display: 'none' }} />
    </label>
  )
}

function EmptyState({ title, subtitle }) {
  return (
    <div style={{ border: '1px dashed #eadde2', borderRadius: 10, padding: 28, textAlign: 'center', color: '#9b8b92', background: '#fffafb' }}>
      <div style={{ fontWeight: 800, color: '#49363d', marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 12, lineHeight: 1.7 }}>{subtitle}</div>}
    </div>
  )
}

export default function ProfessionalAdminDashboard({ lang, t, onLogout, token, onAuthError, isMobile }) {
  const [activeSection, setActiveSection] = useState('home')
  const [orders, setOrders] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [settingsForm, setSettingsForm] = useState(DEFAULT_SETTINGS)
  const [productForm, setProductForm] = useState(() => emptyProductForm([]))
  const [variantForm, setVariantForm] = useState(() => emptyVariantForm(''))
  const [categoryForm, setCategoryForm] = useState(() => emptyCategoryForm())
  const [variantProductId, setVariantProductId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState('')
  const [uploading, setUploading] = useState('')
  const [toast, setToast] = useState(null)
  const [error, setError] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatus, setOrderStatus] = useState('all')
  const [productSearch, setProductSearch] = useState('')
  const [productCategory, setProductCategory] = useState('all')
  const [productStatus, setProductStatus] = useState('all')
  const [colleague, setColleague] = useState('')
  const [openOrderId, setOpenOrderId] = useState('')

  const currency = settings.currency_label || t.tnd

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3200)
  }

  const adminFetch = (url, options = {}) => fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
    },
  })

  const load = async (silent = false) => {
    if (!token) return onAuthError()
    if (!silent) setLoading(true)
    setError('')
    try {
      const res = await adminFetch('/api/admin-dashboard')
      if (res.status === 401) return onAuthError()
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Unable to load admin data.')

      const nextCategories = data.categories || []
      const nextSettings = normalizeSettings(data.settings || {})
      setOrders(data.orders || [])
      setProducts(data.products || [])
      setCategories(nextCategories)
      setSettings(nextSettings)
      setSettingsForm(nextSettings)
      setProductForm(prev => prev.category ? prev : emptyProductForm(nextCategories))
      if (!variantProductId && (data.products || [])[0]?.id) {
        const id = String(data.products[0].id)
        setVariantProductId(id)
        setVariantForm(emptyVariantForm(id))
      }
    } catch (loadError) {
      setError(loadError.message)
    } finally {
      if (!silent) setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const interval = setInterval(() => load(true), 30000)
    return () => clearInterval(interval)
  }, [])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const revenue = orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + Number(order.total || 0), 0)
    const lowStock = products.filter(productLowStock)

    return {
      totalOrders: orders.length,
      todayOrders: orders.filter(order => new Date(order.created_at) >= today).length,
      revenue,
      productCount: products.length,
      lowStock,
      recentOrders: orders.slice(0, 6),
    }
  }, [orders, products])

  const selectedVariantProduct = products.find(product => String(product.id) === String(variantProductId)) || products[0]
  const selectedVariants = selectedVariantProduct?.variants || []

  const uploadImage = (file, target, setter) => {
    if (!file) return
    setUploading(target)
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
        if (!res.ok) throw new Error(data.error || 'Image upload failed.')
        setter(data.url)
        showToast('Image uploaded.')
      } catch (uploadError) {
        setError(uploadError.message)
        showToast(uploadError.message, 'error')
      } finally {
        setUploading('')
      }
    }
    reader.readAsDataURL(file)
  }

  const saveProduct = async () => {
    setSaving('product')
    setError('')
    try {
      const res = await adminFetch('/api/admin-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(productForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Product save failed.')
      setProductForm(emptyProductForm(categories))
      showToast('Product saved.')
    } catch (saveError) {
      setError(saveError.message)
      showToast(saveError.message, 'error')
    } finally {
      setSaving('')
    }
    load(true).catch(() => {})
  }

  const editProduct = product => {
    if (productForm.id && productForm.id !== product.id) {
      if (!window.confirm('Discard unsaved changes to the current product?')) return
    }
    setActiveSection('products')
    setProductForm({
      id: product.id,
      category: product.category || categories[0]?.slug || 'face',
      slug: product.slug || '',
      sku: product.sku || '',
      name_fr: product.nameFr || '',
      name_ar: product.nameAr || '',
      description_fr: product.descriptionFr || '',
      description_ar: product.descriptionAr || '',
      price: product.price || '',
      sale_price: product.salePrice === null ? '' : product.salePrice,
      stock_quantity: product.stockQuantity || 0,
      image_url: product.image || '',
      tag: product.tag || '',
      is_active: product.isActive !== false,
      is_featured: product.isFeatured === true,
      display_order: product.displayOrder || 0,
    })
    setVariantProductId(String(product.id))
    setVariantForm(emptyVariantForm(String(product.id)))
  }

  const deleteProduct = async product => {
    if (!window.confirm(`Deactivate ${getName(product, lang)}?`)) return
    setSaving(`delete-product-${product.id}`)
    try {
      const res = await adminFetch(`/api/admin-products?id=${encodeURIComponent(product.id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Product delete failed.')
      showToast('Product deactivated.')
    } catch (deleteError) {
      setError(deleteError.message)
      showToast(deleteError.message, 'error')
    } finally {
      setSaving('')
    }
    load(true).catch(() => {})
  }

  const saveVariant = async () => {
    setSaving('variant')
    setError('')
    try {
      const payload = { ...variantForm, product_id: variantProductId || variantForm.product_id }
      const res = await adminFetch('/api/admin-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Shade save failed.')
      const productId = String(payload.product_id)
      setVariantProductId(productId)
      setVariantForm(emptyVariantForm(productId))
      showToast('Shade saved.')
    } catch (saveError) {
      setError(saveError.message)
      showToast(saveError.message, 'error')
    } finally {
      setSaving('')
    }
    load(true).catch(() => {})
  }

  const editVariant = variant => {
    setActiveSection('variants')
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

  const deleteVariant = async variant => {
    if (!window.confirm(`Deactivate shade ${variant.shadeName}?`)) return
    setSaving(`delete-variant-${variant.id}`)
    try {
      const res = await adminFetch(`/api/admin-variants?id=${encodeURIComponent(variant.id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Shade delete failed.')
      setVariantForm(emptyVariantForm(variantProductId))
      showToast('Shade deactivated.')
    } catch (deleteError) {
      setError(deleteError.message)
      showToast(deleteError.message, 'error')
    } finally {
      setSaving('')
    }
    load(true).catch(() => {})
  }

  const saveCategory = async () => {
    setSaving('category')
    setError('')
    try {
      const res = await adminFetch('/api/admin-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Category save failed.')
      setCategoryForm(emptyCategoryForm())
      showToast('Category saved.')
    } catch (saveError) {
      setError(saveError.message)
      showToast(saveError.message, 'error')
    } finally {
      setSaving('')
    }
    load(true).catch(() => {})
  }

  const editCategory = category => {
    setCategoryForm({
      id: category.id,
      slug: category.slug || '',
      name_fr: category.nameFr || '',
      name_ar: category.nameAr || '',
      hero_fr: category.heroFr || '',
      hero_ar: category.heroAr || '',
      description_fr: category.descriptionFr || '',
      description_ar: category.descriptionAr || '',
      image_url: category.imageUrl || '',
      display_order: category.displayOrder || 0,
      is_active: category.isActive !== false,
    })
  }

  const deleteCategory = async category => {
    if (!window.confirm(`Delete category ${category.nameFr}? This only works when no products use it.`)) return
    setSaving(`delete-category-${category.id}`)
    try {
      const res = await adminFetch(`/api/admin-categories?id=${encodeURIComponent(category.id)}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Category delete failed.')
      await load(true)
      showToast('Category deleted.')
    } catch (deleteError) {
      setError(deleteError.message)
      showToast(deleteError.message, 'error')
    } finally {
      setSaving('')
    }
  }

  const saveSettings = async () => {
    setSaving('settings')
    setError('')
    try {
      const res = await adminFetch('/api/admin-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: settingsForm }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Settings save failed.')
      const nextSettings = normalizeSettings(data.settings || {})
      setSettings(nextSettings)
      setSettingsForm(nextSettings)
      showToast('Settings saved.')
    } catch (saveError) {
      setError(saveError.message)
      showToast(saveError.message, 'error')
    } finally {
      setSaving('')
    }
  }

  const updateOrder = async (order, status, assignedTo) => {
    if (status === 'cancelled' && order.status !== 'cancelled' && !window.confirm('Cancel this order and restore stock?')) return
    setSaving(`order-${order.id}`)
    try {
      const res = await adminFetch('/api/admin-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: status || undefined,
          assigned_to: assignedTo === undefined ? undefined : assignedTo,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Order update failed.')
      showToast('Order updated.')
    } catch (updateError) {
      setError(updateError.message)
      showToast(updateError.message, 'error')
    } finally {
      setSaving('')
    }
    load(true).catch(() => {})
  }

  const filteredProducts = products.filter(product => {
    const query = productSearch.trim().toLowerCase()
    const matchesText = !query || `${product.nameFr} ${product.nameAr} ${product.sku}`.toLowerCase().includes(query)
    const matchesCategory = productCategory === 'all' || product.category === productCategory
    const matchesStatus = productStatus === 'all'
      || (productStatus === 'active' && product.isActive)
      || (productStatus === 'inactive' && !product.isActive)
      || (productStatus === 'featured' && product.isFeatured)
      || (productStatus === 'low' && productLowStock(product))
    return matchesText && matchesCategory && matchesStatus
  })

  const filteredOrders = orders.filter(order => {
    const query = orderSearch.trim().toLowerCase()
    const haystack = `${order.order_number || order.id} ${order.customer_name} ${order.customer_phone} ${order.governorate} ${order.city} ${(order.items || []).map(item => `${item.nameFr} ${item.shadeName} ${item.sku}`).join(' ')}`.toLowerCase()
    const matchesText = !query || haystack.includes(query)
    const matchesStatus = orderStatus === 'all' || order.status === orderStatus
    return matchesText && matchesStatus
  })

  const orderWhatsappUrl = order => {
    const phone = phoneDigits(order.customer_phone)
    if (!phone) return ''
    const text = `Bonjour ${order.customer_name}, votre commande ${order.order_number || order.id} chez ${settings.store_name || 'Flormar Tunisie'} est en cours de suivi.`
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`
  }

  const renderDashboardHome = () => (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : 'repeat(5,minmax(0,1fr))', gap: 12 }}>
        {[
          ['Total orders', stats.totalOrders],
          ['Today', stats.todayOrders],
          ['Revenue', fmt(stats.revenue, currency)],
          ['Products', stats.productCount],
          ['Low stock', stats.lowStock.length],
        ].map(([label, value]) => (
          <div key={label} style={{ ...panelStyle, padding: 16 }}>
            <div style={{ color: '#9b8b92', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8 }}>{label}</div>
            <div style={{ color: '#24191e', fontSize: 24, fontWeight: 900, marginTop: 7 }}>{value}</div>
          </div>
        ))}
      </div>

      <Grid columns={2} isMobile={isMobile}>
        <Panel title="Recent orders" subtitle="Latest customer activity.">
          {stats.recentOrders.length === 0 ? <EmptyState title="No orders yet" /> : (
            <div style={{ display: 'grid', gap: 8 }}>
              {stats.recentOrders.map(order => (
                <button key={order.id} onClick={() => { setActiveSection('orders'); setOpenOrderId(order.id) }} style={{ border: '1px solid #f0e6ea', background: '#fff', borderRadius: 9, padding: 11, display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, textAlign: 'left', cursor: 'pointer' }}>
                  <span>
                    <strong style={{ color: '#24191e', fontSize: 12 }}>{order.customer_name}</strong>
                    <span style={{ display: 'block', color: '#9b8b92', fontSize: 11, marginTop: 3 }}>{order.order_number || String(order.id).slice(0, 8)} - {new Date(order.created_at).toLocaleString('fr-TN')}</span>
                  </span>
                  <span style={{ textAlign: 'right', color: '#c8254e', fontWeight: 900, fontSize: 12 }}>{fmt(order.total, currency)}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Quick actions" subtitle="Common store tasks.">
          <div style={{ display: 'grid', gap: 10 }}>
            <Button onClick={() => { setActiveSection('products'); setProductForm(emptyProductForm(categories)) }} style={{ width: '100%', justifyContent: 'center' }}>Add product</Button>
            <Button onClick={() => { setActiveSection('categories'); setCategoryForm(emptyCategoryForm()) }} variant="neutral" style={{ width: '100%' }}>Add category</Button>
            <Button onClick={() => setActiveSection('content')} variant="neutral" style={{ width: '100%' }}>Edit homepage</Button>
            <Button onClick={() => setActiveSection('orders')} variant="neutral" style={{ width: '100%' }}>Review orders</Button>
          </div>
        </Panel>
      </Grid>

      <Panel title="Low-stock watchlist" subtitle="Products or shades at 5 units or less.">
        {stats.lowStock.length === 0 ? <EmptyState title="Stock looks healthy" subtitle="No product is under the low-stock threshold." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <tbody>
                {stats.lowStock.slice(0, 12).map(product => (
                  <tr key={product.id} style={{ borderTop: '1px solid #f4ebef' }}>
                    <td style={{ padding: '10px 0', fontWeight: 800 }}>{getName(product, lang)}</td>
                    <td style={{ padding: '10px 0', color: '#9b8b92' }}>{product.category}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right', color: '#c8254e', fontWeight: 900 }}>{product.stockQuantity}</td>
                    <td style={{ padding: '10px 0', textAlign: 'right' }}><Button onClick={() => editProduct(product)} variant="neutral">Edit</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )

  const renderProducts = () => (
    <div style={{ display: 'grid', gap: 18 }}>
      <Panel
        title={productForm.id ? 'Edit product' : 'Add product'}
        subtitle="Name, price, sale price, category, images, stock, active status, and featured placement."
        action={productForm.id ? <Button variant="neutral" onClick={() => setProductForm(emptyProductForm(categories))}>Cancel</Button> : null}
      >
        <Grid columns={4} isMobile={isMobile}>
          <Field label="Category">
            <select value={productForm.category} onChange={event => setProductForm({ ...productForm, category: event.target.value })} style={inputStyle}>
              {categories.map(category => <option key={category.slug} value={category.slug}>{category.nameFr}</option>)}
            </select>
          </Field>
          <Field label="Product name FR">
            <input value={productForm.name_fr} onChange={event => setProductForm({ ...productForm, name_fr: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Product name AR">
            <input value={productForm.name_ar} onChange={event => setProductForm({ ...productForm, name_ar: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Reference / SKU">
            <input value={productForm.sku} onChange={event => setProductForm({ ...productForm, sku: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Base price">
            <input type="number" step="0.001" value={productForm.price} onChange={event => setProductForm({ ...productForm, price: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Sale price">
            <input type="number" step="0.001" value={productForm.sale_price} onChange={event => setProductForm({ ...productForm, sale_price: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Stock">
            <input type="number" min="0" value={productForm.stock_quantity} onChange={event => setProductForm({ ...productForm, stock_quantity: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Display order">
            <input type="number" value={productForm.display_order} onChange={event => setProductForm({ ...productForm, display_order: event.target.value })} style={inputStyle} />
          </Field>
        </Grid>
        <Grid columns={2} isMobile={isMobile} style={{ marginTop: 12 }}>
          <Field label="Description FR">
            <textarea value={productForm.description_fr} onChange={event => setProductForm({ ...productForm, description_fr: event.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
          <Field label="Description AR">
            <textarea value={productForm.description_ar} onChange={event => setProductForm({ ...productForm, description_ar: event.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
          </Field>
        </Grid>
        <Field label="Main image URL">
          <input value={productForm.image_url} onChange={event => setProductForm({ ...productForm, image_url: event.target.value })} style={inputStyle} />
        </Field>
        <ImagePreview src={productForm.image_url} label="This is the storefront product image." />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <UploadButton label="Upload product image" uploading={uploading === 'product'} onFile={file => uploadImage(file, 'product', url => setProductForm(prev => ({ ...prev, image_url: url })))} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#49363d', fontWeight: 700 }}>
            <input type="checkbox" checked={productForm.is_active} onChange={event => setProductForm({ ...productForm, is_active: event.target.checked })} /> Active
          </label>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#49363d', fontWeight: 700 }}>
            <input type="checkbox" checked={productForm.is_featured} onChange={event => setProductForm({ ...productForm, is_featured: event.target.checked })} /> Featured
          </label>
          <Button onClick={saveProduct} disabled={saving === 'product'} style={{ marginLeft: 'auto' }}>{saving === 'product' ? 'Saving...' : 'Save product'}</Button>
        </div>
      </Panel>

      <Panel title="Product catalog" subtitle={`${filteredProducts.length} products shown.`}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <input placeholder="Search products..." value={productSearch} onChange={event => setProductSearch(event.target.value)} style={inputStyle} />
          <select value={productCategory} onChange={event => setProductCategory(event.target.value)} style={inputStyle}>
            <option value="all">All categories</option>
            {categories.map(category => <option key={category.slug} value={category.slug}>{category.nameFr}</option>)}
          </select>
          <select value={productStatus} onChange={event => setProductStatus(event.target.value)} style={inputStyle}>
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="featured">Featured</option>
            <option value="low">Low stock</option>
          </select>
        </div>
        {filteredProducts.length === 0 ? <EmptyState title="No products found" subtitle="Try another search or add a new product." /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760, fontSize: 12 }}>
              <thead>
                <tr style={{ color: '#9b8b92', textAlign: 'left', borderBottom: '1px solid #eadde2' }}>
                  <th style={{ padding: '0 0 10px' }}>Product</th>
                  <th style={{ padding: '0 0 10px' }}>Category</th>
                  <th style={{ padding: '0 0 10px' }}>Price</th>
                  <th style={{ padding: '0 0 10px' }}>Stock</th>
                  <th style={{ padding: '0 0 10px' }}>Status</th>
                  <th style={{ padding: '0 0 10px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map(product => (
                  <tr key={product.id} style={{ borderBottom: '1px solid #f4ebef' }}>
                    <td style={{ padding: '12px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: '#f8f0f3', flexShrink: 0 }}>
                          {product.image && <img src={product.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                        </div>
                        <div>
                          <strong style={{ color: '#24191e' }}>{getName(product, lang)}</strong>
                          <div style={{ color: '#9b8b92', fontSize: 11 }}>{product.sku || product.slug}</div>
                        </div>
                      </div>
                    </td>
                    <td>{product.category}</td>
                    <td>
                      {product.salePrice ? <span style={{ color: '#9b8b92', textDecoration: 'line-through', marginRight: 6 }}>{fmt(product.price, currency)}</span> : null}
                      <strong style={{ color: '#c8254e' }}>{fmt(productFinalPrice(product), currency)}</strong>
                    </td>
                    <td>{product.stockQuantity}</td>
                    <td>
                      <span style={{ color: product.isActive ? '#2ecc71' : '#d94040', fontWeight: 900 }}>{product.isActive ? 'Active' : 'Inactive'}</span>
                      {product.isFeatured ? <span style={{ marginLeft: 8, color: '#c8254e', fontWeight: 900 }}>Featured</span> : null}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Button onClick={() => editProduct(product)} variant="neutral" style={{ marginRight: 7 }}>Edit</Button>
                      <Button onClick={() => { setActiveSection('variants'); setVariantProductId(String(product.id)); setVariantForm(emptyVariantForm(String(product.id))) }} variant="info" style={{ marginRight: 7 }}>Shades</Button>
                      <Button onClick={() => deleteProduct(product)} variant="danger" disabled={saving === `delete-product-${product.id}`}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  )

  const renderVariants = () => (
    <div style={{ display: 'grid', gap: 18 }}>
      <Panel title="Variants and shades" subtitle="Manage shade names, SKU/reference, image, HEX color, stock, active status, and optional shade price.">
        <Field label="Product">
          <select value={variantProductId || selectedVariantProduct?.id || ''} onChange={event => { setVariantProductId(event.target.value); setVariantForm(emptyVariantForm(event.target.value)) }} style={inputStyle}>
            {products.map(product => <option key={product.id} value={product.id}>{getName(product, lang)}</option>)}
          </select>
        </Field>
        <Grid columns={4} isMobile={isMobile}>
          <Field label="Shade name">
            <input value={variantForm.shade_name} onChange={event => setVariantForm({ ...variantForm, shade_name: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="SKU / Reference">
            <input value={variantForm.sku} onChange={event => setVariantForm({ ...variantForm, sku: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Color HEX">
            <input placeholder="#c8254e" value={variantForm.color_hex} onChange={event => setVariantForm({ ...variantForm, color_hex: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Stock">
            <input type="number" min="0" value={variantForm.stock_quantity} onChange={event => setVariantForm({ ...variantForm, stock_quantity: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Optional price">
            <input type="number" step="0.001" value={variantForm.price} onChange={event => setVariantForm({ ...variantForm, price: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Display order">
            <input type="number" value={variantForm.display_order} onChange={event => setVariantForm({ ...variantForm, display_order: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Shade image URL">
            <input value={variantForm.image_url} onChange={event => setVariantForm({ ...variantForm, image_url: event.target.value })} style={inputStyle} />
          </Field>
        </Grid>
        <ImagePreview src={variantForm.image_url} label="Shade-specific image preview." />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <UploadButton label="Upload shade image" uploading={uploading === 'variant'} onFile={file => uploadImage(file, 'variant', url => setVariantForm(prev => ({ ...prev, image_url: url })))} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#49363d', fontWeight: 700 }}>
            <input type="checkbox" checked={variantForm.is_active} onChange={event => setVariantForm({ ...variantForm, is_active: event.target.checked })} /> Active shade
          </label>
          <Button onClick={() => setVariantForm(emptyVariantForm(variantProductId || selectedVariantProduct?.id || ''))} variant="neutral" style={{ marginLeft: 'auto' }}>New shade</Button>
          <Button onClick={saveVariant} disabled={saving === 'variant' || !variantProductId}>{saving === 'variant' ? 'Saving...' : 'Save shade'}</Button>
        </div>
      </Panel>

      <Panel title={`Shades for ${selectedVariantProduct ? getName(selectedVariantProduct, lang) : 'product'}`}>
        {selectedVariants.length === 0 ? <EmptyState title="No shades yet" subtitle="Add the first shade above." /> : (
          <div style={{ display: 'grid', gap: 9 }}>
            {selectedVariants.map(variant => (
              <div key={variant.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr auto', gap: 12, alignItems: 'center', border: '1px solid #f0e6ea', borderRadius: 10, padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ width: 20, height: 20, borderRadius: '50%', background: variant.colorHex || '#f8f0f3', border: '1px solid #eadde2', flexShrink: 0 }} />
                  <div>
                    <strong style={{ color: '#24191e', fontSize: 12 }}>{variant.shadeName}</strong>
                    <div style={{ color: '#9b8b92', fontSize: 11, marginTop: 4 }}>SKU: {variant.sku || '-'} | Stock: {variant.stockQuantity} | Price: {variant.price === null ? 'Base price' : fmt(variant.price, currency)} | {variant.isActive ? 'Active' : 'Inactive'}</div>
                  </div>
                </div>
                <div>
                  <Button onClick={() => editVariant(variant)} variant="neutral" style={{ marginRight: 7 }}>Edit</Button>
                  <Button onClick={() => deleteVariant(variant)} variant="danger" disabled={saving === `delete-variant-${variant.id}`}>Delete</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  )

  const renderCategories = () => (
    <div style={{ display: 'grid', gap: 18 }}>
      <Panel
        title={categoryForm.id ? 'Edit category' : 'Add category'}
        subtitle="Names, storefront hero text, image, order, and visibility."
        action={categoryForm.id ? <Button variant="neutral" onClick={() => setCategoryForm(emptyCategoryForm())}>New category</Button> : null}
      >
        <Grid columns={4} isMobile={isMobile}>
          <Field label="Slug">
            <input value={categoryForm.slug} onChange={event => setCategoryForm({ ...categoryForm, slug: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Name FR">
            <input value={categoryForm.name_fr} onChange={event => setCategoryForm({ ...categoryForm, name_fr: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Name AR">
            <input value={categoryForm.name_ar} onChange={event => setCategoryForm({ ...categoryForm, name_ar: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Display order">
            <input type="number" value={categoryForm.display_order} onChange={event => setCategoryForm({ ...categoryForm, display_order: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Hero FR">
            <input value={categoryForm.hero_fr} onChange={event => setCategoryForm({ ...categoryForm, hero_fr: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Hero AR">
            <input value={categoryForm.hero_ar} onChange={event => setCategoryForm({ ...categoryForm, hero_ar: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Description FR">
            <input value={categoryForm.description_fr} onChange={event => setCategoryForm({ ...categoryForm, description_fr: event.target.value })} style={inputStyle} />
          </Field>
          <Field label="Description AR">
            <input value={categoryForm.description_ar} onChange={event => setCategoryForm({ ...categoryForm, description_ar: event.target.value })} style={inputStyle} />
          </Field>
        </Grid>
        <Field label="Category image URL">
          <input value={categoryForm.image_url} onChange={event => setCategoryForm({ ...categoryForm, image_url: event.target.value })} style={inputStyle} />
        </Field>
        <ImagePreview src={categoryForm.image_url} label="Used on category cards and category hero banners." />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
          <UploadButton label="Upload category image" uploading={uploading === 'category'} onFile={file => uploadImage(file, 'category', url => setCategoryForm(prev => ({ ...prev, image_url: url })))} />
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 12, color: '#49363d', fontWeight: 700 }}>
            <input type="checkbox" checked={categoryForm.is_active} onChange={event => setCategoryForm({ ...categoryForm, is_active: event.target.checked })} /> Show category
          </label>
          <Button onClick={saveCategory} disabled={saving === 'category'} style={{ marginLeft: 'auto' }}>{saving === 'category' ? 'Saving...' : 'Save category'}</Button>
        </div>
      </Panel>

      <Panel title="Categories" subtitle="Hidden categories disappear from the storefront. Delete only works when no products use the category.">
        <div style={{ display: 'grid', gap: 9 }}>
          {categories.map(category => (
            <div key={category.id} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '80px 1fr auto', gap: 12, alignItems: 'center', border: '1px solid #f0e6ea', borderRadius: 10, padding: 12 }}>
              <div style={{ width: 74, height: 56, borderRadius: 8, overflow: 'hidden', background: '#f8f0f3' }}>
                {category.imageUrl && <img src={category.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              </div>
              <div>
                <strong style={{ color: '#24191e', fontSize: 13 }}>{category.nameFr}</strong>
                <div style={{ color: '#9b8b92', fontSize: 11, marginTop: 4 }}>{category.slug} | Order {category.displayOrder} | {category.isActive ? 'Visible' : 'Hidden'}</div>
              </div>
              <div>
                <Button onClick={() => editCategory(category)} variant="neutral" style={{ marginRight: 7 }}>Edit</Button>
                <Button onClick={() => deleteCategory(category)} variant="danger" disabled={saving === `delete-category-${category.id}`}>Delete</Button>
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  )

  const renderOrders = () => (
    <div style={{ display: 'grid', gap: 18 }}>
      <Panel title="Orders" subtitle="Search, filter, contact customers, assign work, change status, and cancel with stock restoration.">
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <input placeholder="Search by customer, phone, order, product, shade, SKU..." value={orderSearch} onChange={event => setOrderSearch(event.target.value)} style={inputStyle} />
          <select value={orderStatus} onChange={event => setOrderStatus(event.target.value)} style={inputStyle}>
            <option value="all">All statuses</option>
            {Object.keys(STATUS_LABELS).map(status => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
          </select>
          <input placeholder="Your name for assignment" value={colleague} onChange={event => setColleague(event.target.value)} style={inputStyle} />
        </div>
        {filteredOrders.length === 0 ? <EmptyState title="No orders found" subtitle="Try another search or status." /> : (
          <div style={{ display: 'grid', gap: 10 }}>
            {filteredOrders.map(order => {
              const open = openOrderId === order.id
              return (
                <div key={order.id} style={{ border: '1px solid #f0e6ea', borderLeft: `4px solid ${STATUS_COLORS[order.status] || '#c8254e'}`, borderRadius: 10, background: '#fff', overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr auto', gap: 12, padding: 14, alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#24191e', fontSize: 13 }}>{order.order_number || String(order.id).slice(0, 8)} - {order.customer_name}</strong>
                      <div style={{ color: '#9b8b92', fontSize: 11, marginTop: 4 }}>{new Date(order.created_at).toLocaleString('fr-TN')} | {order.customer_phone} | {order.governorate}, {order.city}</div>
                    </div>
                    <div>
                      <span style={{ color: STATUS_COLORS[order.status], fontWeight: 900, fontSize: 12 }}>{STATUS_LABELS[order.status] || order.status}</span>
                      <span style={{ display: 'block', color: '#c8254e', fontWeight: 900, marginTop: 4 }}>{fmt(order.total, currency)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: isMobile ? 'flex-start' : 'flex-end' }}>
                      <Button onClick={() => setOpenOrderId(open ? '' : order.id)} variant="neutral">{open ? 'Hide' : 'Details'}</Button>
                      {orderWhatsappUrl(order) && <Button onClick={() => window.open(orderWhatsappUrl(order), '_blank', 'noopener,noreferrer')} variant="success">WhatsApp</Button>}
                    </div>
                  </div>
                  {open && (
                    <div style={{ borderTop: '1px solid #f4ebef', padding: 14, background: '#fffafb' }}>
                      <Grid columns={2} isMobile={isMobile}>
                        <div>
                          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#24191e' }}>Customer</h3>
                          <p style={{ margin: 0, color: '#49363d', fontSize: 12, lineHeight: 1.8 }}>{order.customer_name}<br />{order.customer_phone}<br />{order.address}<br />{order.governorate}, {order.city}</p>
                          {order.assigned_to && <p style={{ margin: '8px 0 0', color: '#3498db', fontSize: 12, fontWeight: 800 }}>Assigned to {order.assigned_to}</p>}
                        </div>
                        <div>
                          <h3 style={{ margin: '0 0 8px', fontSize: 12, color: '#24191e' }}>Items</h3>
                          {(order.items || []).map((item, index) => (
                            <div key={index} style={{ color: '#49363d', fontSize: 12, lineHeight: 1.6, marginBottom: 7 }}>
                              <strong>{getName(item, lang)}</strong> x{item.qty} - {fmt(item.price * item.qty, currency)}
                              {item.shadeName && <div style={{ color: '#9b8b92', fontSize: 11 }}>Shade: {item.shadeName} {item.sku ? `| SKU: ${item.sku}` : ''}</div>}
                            </div>
                          ))}
                        </div>
                      </Grid>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                        {order.status !== 'confirmed' && order.status !== 'delivered' && order.status !== 'cancelled' && <Button onClick={() => updateOrder(order, 'confirmed')} variant="info">Confirm</Button>}
                        {order.status === 'confirmed' && <Button onClick={() => updateOrder(order, 'delivered')} variant="success">Mark delivered</Button>}
                        {order.status !== 'cancelled' && order.status !== 'delivered' && <Button onClick={() => updateOrder(order, 'cancelled')} variant="danger">Cancel order</Button>}
                        {colleague && <Button onClick={() => updateOrder(order, null, colleague)} variant="neutral">Assign to me</Button>}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Panel>
    </div>
  )

  const renderContent = () => (
    <Panel title="Homepage content editor" subtitle="Update the visible storefront hero, announcement bar, promotional copy, WhatsApp, and hero image.">
      <Grid columns={2} isMobile={isMobile}>
        <Field label="Hero title FR"><input value={settingsForm.hero_title_fr} onChange={event => setSettingsForm({ ...settingsForm, hero_title_fr: event.target.value })} style={inputStyle} /></Field>
        <Field label="Hero title AR"><input value={settingsForm.hero_title_ar} onChange={event => setSettingsForm({ ...settingsForm, hero_title_ar: event.target.value })} style={inputStyle} /></Field>
        <Field label="Hero subtitle FR"><textarea value={settingsForm.hero_subtitle_fr} onChange={event => setSettingsForm({ ...settingsForm, hero_subtitle_fr: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        <Field label="Hero subtitle AR"><textarea value={settingsForm.hero_subtitle_ar} onChange={event => setSettingsForm({ ...settingsForm, hero_subtitle_ar: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        <Field label="Announcement FR"><input value={settingsForm.announcement_fr} onChange={event => setSettingsForm({ ...settingsForm, announcement_fr: event.target.value })} style={inputStyle} /></Field>
        <Field label="Announcement AR"><input value={settingsForm.announcement_ar} onChange={event => setSettingsForm({ ...settingsForm, announcement_ar: event.target.value })} style={inputStyle} /></Field>
        <Field label="Promotional text FR"><input value={settingsForm.promotional_text_fr} onChange={event => setSettingsForm({ ...settingsForm, promotional_text_fr: event.target.value })} style={inputStyle} /></Field>
        <Field label="Promotional text AR"><input value={settingsForm.promotional_text_ar} onChange={event => setSettingsForm({ ...settingsForm, promotional_text_ar: event.target.value })} style={inputStyle} /></Field>
      </Grid>
      <Field label="Hero image / banner URL">
        <input value={settingsForm.hero_image_url} onChange={event => setSettingsForm({ ...settingsForm, hero_image_url: event.target.value })} style={inputStyle} />
      </Field>
      <ImagePreview src={settingsForm.hero_image_url} label="Shown on the storefront hero." />
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 14 }}>
        <UploadButton label="Upload hero image" uploading={uploading === 'hero'} onFile={file => uploadImage(file, 'hero', url => setSettingsForm(prev => ({ ...prev, hero_image_url: url })))} />
        <Button onClick={saveSettings} disabled={saving === 'settings'}>{saving === 'settings' ? 'Saving...' : 'Save homepage'}</Button>
      </div>
    </Panel>
  )

  const renderSettings = () => (
    <Panel title="Store settings" subtitle="Store name, contact details, delivery, currency, payment text, footer, and social links.">
      <Grid columns={3} isMobile={isMobile}>
        <Field label="Store name"><input value={settingsForm.store_name} onChange={event => setSettingsForm({ ...settingsForm, store_name: event.target.value })} style={inputStyle} /></Field>
        <Field label="Phone"><input value={settingsForm.phone} onChange={event => setSettingsForm({ ...settingsForm, phone: event.target.value })} style={inputStyle} /></Field>
        <Field label="WhatsApp number"><input value={settingsForm.whatsapp_number} onChange={event => setSettingsForm({ ...settingsForm, whatsapp_number: event.target.value })} style={inputStyle} /></Field>
        <Field label="Currency label"><input value={settingsForm.currency_label} onChange={event => setSettingsForm({ ...settingsForm, currency_label: event.target.value })} style={inputStyle} /></Field>
        <Field label="Delivery FR"><input value={settingsForm.delivery_message_fr} onChange={event => setSettingsForm({ ...settingsForm, delivery_message_fr: event.target.value })} style={inputStyle} /></Field>
        <Field label="Delivery AR"><input value={settingsForm.delivery_message_ar} onChange={event => setSettingsForm({ ...settingsForm, delivery_message_ar: event.target.value })} style={inputStyle} /></Field>
        <Field label="COD text FR"><input value={settingsForm.cod_text_fr} onChange={event => setSettingsForm({ ...settingsForm, cod_text_fr: event.target.value })} style={inputStyle} /></Field>
        <Field label="COD text AR"><input value={settingsForm.cod_text_ar} onChange={event => setSettingsForm({ ...settingsForm, cod_text_ar: event.target.value })} style={inputStyle} /></Field>
        <Field label="Instagram"><input value={settingsForm.instagram_url} onChange={event => setSettingsForm({ ...settingsForm, instagram_url: event.target.value })} style={inputStyle} /></Field>
        <Field label="Facebook"><input value={settingsForm.facebook_url} onChange={event => setSettingsForm({ ...settingsForm, facebook_url: event.target.value })} style={inputStyle} /></Field>
        <Field label="TikTok"><input value={settingsForm.tiktok_url} onChange={event => setSettingsForm({ ...settingsForm, tiktok_url: event.target.value })} style={inputStyle} /></Field>
      </Grid>
      <Grid columns={2} isMobile={isMobile}>
        <Field label="Footer text FR"><textarea value={settingsForm.footer_text_fr} onChange={event => setSettingsForm({ ...settingsForm, footer_text_fr: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
        <Field label="Footer text AR"><textarea value={settingsForm.footer_text_ar} onChange={event => setSettingsForm({ ...settingsForm, footer_text_ar: event.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} /></Field>
      </Grid>
      <div style={{ marginTop: 14 }}>
        <Button onClick={saveSettings} disabled={saving === 'settings'}>{saving === 'settings' ? 'Saving...' : 'Save settings'}</Button>
      </div>
    </Panel>
  )

  const renderActiveSection = () => {
    if (activeSection === 'home') return renderDashboardHome()
    if (activeSection === 'orders') return renderOrders()
    if (activeSection === 'products') return renderProducts()
    if (activeSection === 'variants') return renderVariants()
    if (activeSection === 'categories') return renderCategories()
    if (activeSection === 'content') return renderContent()
    if (activeSection === 'settings') return renderSettings()
    return null
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f3f4', color: '#24191e', fontFamily: "'Montserrat',sans-serif", direction: lang === 'ar' ? 'rtl' : 'ltr' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '248px minmax(0,1fr)', minHeight: '100vh' }}>
        <aside style={{ background: '#171214', color: '#fff', padding: isMobile ? 14 : 18, position: isMobile ? 'relative' : 'sticky', top: 0, height: isMobile ? 'auto' : '100vh', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: isMobile ? 14 : 28 }}>
            <div>
              <div style={{ color: '#fff', fontFamily: "'Cormorant Garamond',serif", fontSize: 26, letterSpacing: 3, lineHeight: 1 }}>FLORMAR</div>
              <div style={{ color: '#c8254e', fontSize: 9, letterSpacing: 3, fontWeight: 800, marginTop: 4 }}>STORE CMS</div>
            </div>
            {isMobile && <Button onClick={onLogout} variant="neutral">Logout</Button>}
          </div>
          <nav style={{ display: 'grid', gap: 7, gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : '1fr' }}>
            {ADMIN_SECTIONS.map(section => (
              <button key={section.key} onClick={() => setActiveSection(section.key)} style={{
                border: 'none',
                borderRadius: 9,
                padding: '11px 12px',
                textAlign: 'left',
                background: activeSection === section.key ? '#c8254e' : 'transparent',
                color: activeSection === section.key ? '#fff' : '#d7cbd0',
                fontSize: 12,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: "'Montserrat',sans-serif",
              }}>
                {section.label}
              </button>
            ))}
          </nav>
          {!isMobile && (
            <div style={{ position: 'absolute', left: 18, right: 18, bottom: 18 }}>
              <Button onClick={load} variant="neutral" style={{ width: '100%', marginBottom: 9 }}>Refresh</Button>
              <Button onClick={onLogout} style={{ width: '100%' }}>Logout</Button>
            </div>
          )}
        </aside>

        <main style={{ padding: isMobile ? '18px 14px 46px' : '24px 28px 54px', minWidth: 0 }}>
          <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
            <div>
              <h1 style={{ margin: 0, color: '#24191e', fontSize: isMobile ? 24 : 30, fontWeight: 900 }}>{ADMIN_SECTIONS.find(section => section.key === activeSection)?.label}</h1>
              <p style={{ margin: '7px 0 0', color: '#7b6870', fontSize: 13, lineHeight: 1.6 }}>{settings.store_name || 'Flormar Tunisie'} management dashboard</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#7b6870', fontSize: 11, background: '#fff', border: '1px solid #f0e6ea', borderRadius: 999, padding: '8px 11px' }}>Auto-refresh 30s</span>
              <Button onClick={() => load()} variant="neutral">Refresh</Button>
            </div>
          </header>

          {error && (
            <div style={{ background: '#fff5f6', border: '1px solid #f0b9c5', borderRadius: 10, color: '#c8254e', padding: '12px 14px', fontSize: 12, marginBottom: 16, lineHeight: 1.6 }}>
              {error}
            </div>
          )}

          {loading ? (
            <div style={{ ...panelStyle, padding: 44, color: '#9b8b92', textAlign: 'center', fontWeight: 800 }}>Loading admin data...</div>
          ) : renderActiveSection()}
        </main>
      </div>

      {toast && (
        <div style={{
          position: 'fixed',
          right: 18,
          bottom: 18,
          background: toast.type === 'error' ? '#c8254e' : '#171214',
          color: '#fff',
          borderRadius: 10,
          padding: '12px 14px',
          boxShadow: '0 12px 34px rgba(0,0,0,0.18)',
          fontSize: 12,
          fontWeight: 800,
          zIndex: 3000,
          maxWidth: 320,
        }}>
          {toast.message}
        </div>
      )}
    </div>
  )
}
