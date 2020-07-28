#!/bin/sh
# Synoptics.
# Copyright (C) 2019 DISIT Lab http://www.disit.org - University of Florence
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU Affero General Public License for more details.
# You should have received a copy of the GNU Affero General Public License
# along with this program. If not, see <http://www.gnu.org/licenses/>.
cd "$(dirname "$0")"
while true
do
  echo $(date) starting load... >> server-emulator-kpi.log
  node server-emulator-kpi.js >> server-emulator-kpi.log 2>&1
  sleep 5
done

