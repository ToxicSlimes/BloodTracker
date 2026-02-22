import { describe, it, expect, vi, beforeEach } from 'vitest'
import { reactive, subscribe, computed } from '../reactive'

describe('reactive', () => {
  it('создаёт reactive store', () => {
    const store = reactive({ count: 0 })
    expect(store.count).toBe(0)
  })

  it('читает значения', () => {
    const store = reactive({ name: 'test', value: 42 })
    expect(store.name).toBe('test')
    expect(store.value).toBe(42)
  })

  it('устанавливает значения', () => {
    const store = reactive({ count: 0 })
    store.count = 10
    expect(store.count).toBe(10)
  })

  it('вызывает callback при изменении', async () => {
    const store = reactive({ count: 0 })
    const callback = vi.fn()
    subscribe('count', callback)
    
    store.count = 5
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('вызывает callback для вложенного объекта', async () => {
    const store = reactive({ user: { name: 'Alice' } })
    const callback = vi.fn()
    subscribe('user', callback)
    
    store.user.name = 'Bob'
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('вызывает callback для массива', async () => {
    const store = reactive({ items: [1, 2, 3] })
    const callback = vi.fn()
    subscribe('items', callback)
    
    store.items.push(4)
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('batched updates вызывают один callback', async () => {
    const store = reactive({ count: 0 })
    const callback = vi.fn()
    subscribe('count', callback)
    
    store.count = 1
    store.count = 2
    store.count = 3
    
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('вложенное поле триггерит корневую подписку', async () => {
    const store = reactive({ nested: { deep: { value: 10 } } })
    const callback = vi.fn()
    subscribe('nested', callback)
    
    store.nested.deep.value = 20
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('массив push триггерит подписку', async () => {
    const store = reactive({ list: [] as number[] })
    const callback = vi.fn()
    subscribe('list', callback)
    
    store.list.push(1)
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('массив pop триггерит подписку', async () => {
    const store = reactive({ list: [1, 2, 3] })
    const callback = vi.fn()
    subscribe('list', callback)
    
    store.list.pop()
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('массив splice триггерит подписку', async () => {
    const store = reactive({ list: [1, 2, 3] })
    const callback = vi.fn()
    subscribe('list', callback)
    
    store.list.splice(1, 1)
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('массив shift триггерит подписку', async () => {
    const store = reactive({ list: [1, 2, 3] })
    const callback = vi.fn()
    subscribe('list', callback)
    
    store.list.shift()
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('deleteProperty триггерит подписку', async () => {
    const store = reactive({ temp: 42 })
    const callback = vi.fn()
    subscribe('temp', callback)
    
    delete store.temp
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('proxy кеширование возвращает тот же proxy', () => {
    const store = reactive({ obj: { value: 10 } })
    const proxy1 = store.obj
    const proxy2 = store.obj
    expect(proxy1).toBe(proxy2)
  })
})

describe('subscribe', () => {
  it('вызывает callback при изменении', async () => {
    const store = reactive({ count: 0 })
    const callback = vi.fn()
    subscribe('count', callback)
    
    store.count = 1
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
  })

  it('unsubscribe останавливает вызовы', async () => {
    const store = reactive({ count: 0 })
    const callback = vi.fn()
    const unsub = subscribe('count', callback)
    
    store.count = 1
    await vi.waitFor(() => expect(callback).toHaveBeenCalledTimes(1))
    
    unsub()
    store.count = 2
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('множественные подписки срабатывают', async () => {
    const store = reactive({ count: 0 })
    const callback1 = vi.fn()
    const callback2 = vi.fn()
    subscribe('count', callback1)
    subscribe('count', callback2)
    
    store.count = 1
    await vi.waitFor(() => {
      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
    })
  })

  it('не вызывает callback для других ключей', async () => {
    const store = reactive({ a: 1, b: 2 })
    const callback = vi.fn()
    subscribe('a', callback)
    
    store.b = 3
    await new Promise(resolve => setTimeout(resolve, 50))
    expect(callback).not.toHaveBeenCalled()
  })

  it('обрабатывает ошибки в callback', async () => {
    const store = reactive({ count: 0 })
    const errorCallback = vi.fn(() => { throw new Error('test error') })
    const normalCallback = vi.fn()
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    subscribe('count', errorCallback)
    subscribe('count', normalCallback)
    
    store.count = 1
    await vi.waitFor(() => {
      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(normalCallback).toHaveBeenCalledTimes(1)
    })
    
    consoleSpy.mockRestore()
  })
})

describe('computed', () => {
  it('автоматически перерасчитывается при изменении зависимости', async () => {
    const store = reactive({ count: 0 })
    const doubled = computed(['count'], () => store.count * 2)
    
    expect(doubled.value).toBe(0)
    
    store.count = 5
    await vi.waitFor(() => expect(doubled.value).toBe(10))
  })

  it('работает с несколькими зависимостями', async () => {
    const store = reactive({ a: 2, b: 3 })
    const sum = computed(['a', 'b'], () => store.a + store.b)
    
    expect(sum.value).toBe(5)
    
    store.a = 10
    await vi.waitFor(() => expect(sum.value).toBe(13))
    
    store.b = 7
    await vi.waitFor(() => expect(sum.value).toBe(17))
  })

  it('кеширует значение между обновлениями', async () => {
    const store = reactive({ count: 0 })
    const fn = vi.fn(() => store.count * 2)
    const doubled = computed(['count'], fn)
    
    const v1 = doubled.value
    const v2 = doubled.value
    
    expect(v1).toBe(v2)
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('работает с вложенными данными', async () => {
    const store = reactive({ user: { age: 20 } })
    const canDrink = computed(['user'], () => store.user.age >= 21)
    
    expect(canDrink.value).toBe(false)
    
    store.user.age = 25
    await vi.waitFor(() => expect(canDrink.value).toBe(true))
  })

  it('работает с массивами', async () => {
    const store = reactive({ items: [1, 2, 3] })
    const total = computed(['items'], () => store.items.reduce((a, b) => a + b, 0))
    
    expect(total.value).toBe(6)
    
    store.items.push(4)
    await vi.waitFor(() => expect(total.value).toBe(10))
  })
})

describe('flush loop protection', () => {
  it('защищает от бесконечных циклов', async () => {
    const store = reactive({ count: 0 })
    
    let callCount = 0
    subscribe('count', () => {
      callCount++
      if (callCount < 100) {
        store.count++
      }
    })
    
    store.count = 1
    
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(callCount).toBeGreaterThanOrEqual(50)
    expect(callCount).toBeLessThan(200)
  })
})
