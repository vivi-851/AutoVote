// 出站到「真实预测市场」的 choke-point。
// 现在原样返回 URL；将来要接导流返佣，只需在这一处统一拼接 ref / utm 参数，
// 全站的「去真实市场」外链一处改、全局生效。配合 track('outbound_market') 计点击。

export function outboundMarketUrl(card: { polymarketUrl: string }): string {
  return card.polymarketUrl;
}
