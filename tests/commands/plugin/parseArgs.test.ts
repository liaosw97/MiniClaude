import { describe, it, expect } from 'vitest'
import { parsePluginArgs } from '../../../src/commands/plugin/parseArgs.js'

describe('parsePluginArgs', () => {
  // 无参数 → menu
  it('返回 menu 当无参数', () => {
    expect(parsePluginArgs()).toEqual({ type: 'menu' })
    expect(parsePluginArgs('')).toEqual({ type: 'menu' })
    expect(parsePluginArgs('  ')).toEqual({ type: 'menu' })
  })

  // help 命令
  it('解析 help 命令', () => {
    expect(parsePluginArgs('help')).toEqual({ type: 'help' })
    expect(parsePluginArgs('--help')).toEqual({ type: 'help' })
    expect(parsePluginArgs('-h')).toEqual({ type: 'help' })
  })

  // install 命令
  it('解析 install 无参数', () => {
    expect(parsePluginArgs('install')).toEqual({ type: 'install' })
  })

  it('解析 install plugin@marketplace', () => {
    expect(parsePluginArgs('install myPlugin@myMarket')).toEqual({
      type: 'install',
      plugin: 'myPlugin',
      marketplace: 'myMarket',
    })
  })

  it('解析 install marketplace URL', () => {
    expect(parsePluginArgs('install https://example.com/market')).toEqual({
      type: 'install',
      marketplace: 'https://example.com/market',
    })
  })

  it('解析 install file:// 路径', () => {
    expect(parsePluginArgs('install file:///path/to/market')).toEqual({
      type: 'install',
      marketplace: 'file:///path/to/market',
    })
  })

  it('解析 install 含斜杠的路径作为 marketplace', () => {
    expect(parsePluginArgs('install ./local/path')).toEqual({
      type: 'install',
      marketplace: './local/path',
    })
  })

  it('解析 install 插件名', () => {
    expect(parsePluginArgs('install my-plugin')).toEqual({
      type: 'install',
      plugin: 'my-plugin',
    })
  })

  it('解析 install 缩写 i', () => {
    expect(parsePluginArgs('i my-plugin')).toEqual({
      type: 'install',
      plugin: 'my-plugin',
    })
  })

  // manage
  it('解析 manage 命令', () => {
    expect(parsePluginArgs('manage')).toEqual({ type: 'manage' })
  })

  // uninstall
  it('解析 uninstall 命令', () => {
    expect(parsePluginArgs('uninstall my-plugin')).toEqual({
      type: 'uninstall',
      plugin: 'my-plugin',
    })
  })

  // enable/disable
  it('解析 enable 命令', () => {
    expect(parsePluginArgs('enable my-plugin')).toEqual({
      type: 'enable',
      plugin: 'my-plugin',
    })
  })

  it('解析 disable 命令', () => {
    expect(parsePluginArgs('disable my-plugin')).toEqual({
      type: 'disable',
      plugin: 'my-plugin',
    })
  })

  // validate
  it('解析 validate 无路径', () => {
    expect(parsePluginArgs('validate')).toEqual({ type: 'validate' })
  })

  it('解析 validate 含路径', () => {
    expect(parsePluginArgs('validate /path/to/plugin')).toEqual({
      type: 'validate',
      path: '/path/to/plugin',
    })
  })

  // marketplace
  it('解析 marketplace 无 action', () => {
    expect(parsePluginArgs('marketplace')).toEqual({ type: 'marketplace' })
    expect(parsePluginArgs('market')).toEqual({ type: 'marketplace' })
  })

  it('解析 marketplace add', () => {
    expect(parsePluginArgs('marketplace add https://example.com')).toEqual({
      type: 'marketplace',
      action: 'add',
      target: 'https://example.com',
    })
  })

  it('解析 marketplace remove', () => {
    expect(parsePluginArgs('marketplace remove my-market')).toEqual({
      type: 'marketplace',
      action: 'remove',
      target: 'my-market',
    })
  })

  it('解析 marketplace rm (别名)', () => {
    expect(parsePluginArgs('market rm my-market')).toEqual({
      type: 'marketplace',
      action: 'remove',
      target: 'my-market',
    })
  })

  it('解析 marketplace update', () => {
    expect(parsePluginArgs('marketplace update my-market')).toEqual({
      type: 'marketplace',
      action: 'update',
      target: 'my-market',
    })
  })

  it('解析 marketplace list', () => {
    expect(parsePluginArgs('marketplace list')).toEqual({
      type: 'marketplace',
      action: 'list',
    })
  })

  // 未知命令
  it('返回 menu 当命令未知', () => {
    expect(parsePluginArgs('unknown')).toEqual({ type: 'menu' })
  })

  // 大小写不敏感
  it('命令大小写不敏感', () => {
    expect(parsePluginArgs('HELP')).toEqual({ type: 'help' })
    expect(parsePluginArgs('Install my-plugin')).toEqual({
      type: 'install',
      plugin: 'my-plugin',
    })
  })
})
