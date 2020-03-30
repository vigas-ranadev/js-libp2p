'use strict'

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multiaddr = require('multiaddr')
const errCode = require('err-code')

/**
 * Converts the given `peer` to a `PeerInfo` instance.
 * The `PeerStore` will be checked for the resulting peer, and
 * the peer will be updated in the `PeerStore`.
 *
 * @param {PeerInfo|PeerId|Multiaddr|string} peer
 * @param {PeerStore} peerStore
 * @returns {PeerInfo}
 */
function getPeerInfo (peer, peerStore) {
  if (typeof peer === 'string') {
    peer = multiaddr(peer)
  }

  let addr
  if (multiaddr.isMultiaddr(peer)) {
    addr = peer
    try {
      peer = PeerId.createFromB58String(peer.getPeerId())
    } catch (err) {
      throw errCode(
        new Error(`${peer} is not a valid peer type`),
        'ERR_INVALID_MULTIADDR'
      )
    }
  }

  if (PeerId.isPeerId(peer)) {
    peer = new PeerInfo(peer)
  }

  addr && peer.multiaddrs.add(addr)

  return peerStore ? peerStore.put(peer, { replace: false }) : peer
}

/**
 * If `getPeerInfo` does not return a peer with multiaddrs,
 * the `libp2p` PeerRouter will be used to attempt to find the peer.
 *
 * @async
 * @param {PeerInfo|PeerId|Multiaddr|string} peer
 * @param {Libp2p} libp2p
 * @returns {Promise<PeerInfo>}
 */
function getPeerInfoRemote (peer, libp2p) {
  let peerInfo

  try {
    peerInfo = getPeerInfo(peer, libp2p.peerStore)
  } catch (err) {
    throw errCode(err, 'ERR_INVALID_PEER_TYPE')
  }

  // If we don't have an address for the peer, attempt to find it
  if (peerInfo.multiaddrs.size < 1) {
    return libp2p.peerRouting.findPeer(peerInfo.id)
  }

  return peerInfo
}

module.exports = {
  getPeerInfoRemote,
  getPeerInfo
}
