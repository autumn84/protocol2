/*

  Copyright 2017 Loopring Project Ltd (Loopring Foundation).

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
pragma solidity 0.4.24;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../iface/ITokenRegistry.sol";

/// @author Brecht Devos - <brecht@loopring.org>
contract DummyAgency {

    address public tokenRegistryAddress = 0x0;

    constructor(
        address _tokenRegistryAddress
        )
        public
    {
        require(_tokenRegistryAddress != 0x0);
        tokenRegistryAddress = _tokenRegistryAddress;
    }

    function registerToken(
        address addr,
        string  symbol
        )
        external
    {
        ITokenRegistry(tokenRegistryAddress).registerToken(addr, symbol);
    }

    function unregisterToken(
        address addr
        )
        external
    {
        ITokenRegistry(tokenRegistryAddress).unregisterToken(addr);
    }

}