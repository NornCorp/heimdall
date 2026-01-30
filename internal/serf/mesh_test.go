package serf

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/require"
)

func TestNewMesh(t *testing.T) {
	config := MeshConfig{
		NodeName: "test-node",
		BindAddr: "127.0.0.1",
		BindPort: 7946,
		Tags: map[string]string{
			"role": "test",
		},
	}

	mesh, err := NewMesh(config)
	require.NoError(t, err)
	require.NotNil(t, mesh)
	require.Equal(t, "test-node", mesh.config.NodeName)
	require.Equal(t, "127.0.0.1", mesh.config.BindAddr)
	require.Equal(t, 7946, mesh.config.BindPort)
	require.Equal(t, "test", mesh.config.Tags["role"])
}

func TestNewMeshNoName(t *testing.T) {
	config := MeshConfig{
		BindAddr: "127.0.0.1",
	}

	mesh, err := NewMesh(config)
	require.Error(t, err)
	require.Nil(t, mesh)
	require.Contains(t, err.Error(), "node name is required")
}

func TestNewMeshDefaults(t *testing.T) {
	config := MeshConfig{
		NodeName: "test-node",
	}

	mesh, err := NewMesh(config)
	require.NoError(t, err)
	require.NotNil(t, mesh)
	require.Equal(t, "0.0.0.0", mesh.config.BindAddr)
	require.Equal(t, 0, mesh.config.BindPort) // 0 means OS chooses
}

func TestMeshStart(t *testing.T) {
	config := MeshConfig{
		NodeName: "test-node",
		BindAddr: "127.0.0.1",
		BindPort: 0, // Use random port
	}

	mesh, err := NewMesh(config)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh.Start(ctx)
	require.NoError(t, err)
	require.NotNil(t, mesh.serf)

	// Cleanup
	err = mesh.Stop()
	require.NoError(t, err)
}

func TestMeshStartWithJoin(t *testing.T) {
	// Create first mesh
	config1 := MeshConfig{
		NodeName: "node1",
		BindAddr: "127.0.0.1",
		BindPort: 0,
		Tags: map[string]string{
			"role": "primary",
		},
	}

	mesh1, err := NewMesh(config1)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh1.Start(ctx)
	require.NoError(t, err)
	defer mesh1.Stop()

	// Get the actual port that was bound
	members := mesh1.Members()
	require.Len(t, members, 1)
	actualPort := members[0].Port

	// Create second mesh and join first
	config2 := MeshConfig{
		NodeName:  "node2",
		BindAddr:  "127.0.0.1",
		BindPort:  0,
		JoinAddrs: []string{fmt.Sprintf("127.0.0.1:%d", actualPort)},
		Tags: map[string]string{
			"role": "secondary",
		},
	}

	mesh2, err := NewMesh(config2)
	require.NoError(t, err)

	err = mesh2.Start(ctx)
	require.NoError(t, err)
	defer mesh2.Stop()

	// Wait for cluster to converge
	time.Sleep(100 * time.Millisecond)

	// Verify both meshes see each other
	members1 := mesh1.Members()
	members2 := mesh2.Members()

	require.Len(t, members1, 2)
	require.Len(t, members2, 2)
}

func TestMeshMembers(t *testing.T) {
	config := MeshConfig{
		NodeName: "test-node",
		BindAddr: "127.0.0.1",
		BindPort: 0,
		Tags: map[string]string{
			"role":    "test",
			"version": "1.0",
		},
	}

	mesh, err := NewMesh(config)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh.Start(ctx)
	require.NoError(t, err)
	defer mesh.Stop()

	members := mesh.Members()
	require.Len(t, members, 1)

	member := members[0]
	require.Equal(t, "test-node", member.Name)
	require.Equal(t, "test", member.Tags["role"])
	require.Equal(t, "1.0", member.Tags["version"])
	require.Equal(t, "alive", member.Status)
}

func TestMeshEvents(t *testing.T) {
	// Create first mesh
	config1 := MeshConfig{
		NodeName: "node1",
		BindAddr: "127.0.0.1",
		BindPort: 0,
	}

	mesh1, err := NewMesh(config1)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh1.Start(ctx)
	require.NoError(t, err)
	defer mesh1.Stop()

	// Setup join callback
	var joinOnce sync.Once
	var joinedMember *Member
	joinDone := make(chan struct{})

	mesh1.OnJoin(func(m *Member) {
		// Only capture the first join event for node2
		if m.Name == "node2" {
			joinOnce.Do(func() {
				joinedMember = m
				close(joinDone)
			})
		}
	})

	// Get the actual port
	members := mesh1.Members()
	require.Len(t, members, 1)
	actualPort := members[0].Port

	// Create second mesh and join
	config2 := MeshConfig{
		NodeName:  "node2",
		BindAddr:  "127.0.0.1",
		BindPort:  0,
		JoinAddrs: []string{fmt.Sprintf("127.0.0.1:%d", actualPort)},
	}

	mesh2, err := NewMesh(config2)
	require.NoError(t, err)

	err = mesh2.Start(ctx)
	require.NoError(t, err)

	// Wait for join event
	select {
	case <-joinDone:
		// Success
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for join event")
	}

	require.NotNil(t, joinedMember)
	require.Equal(t, "node2", joinedMember.Name)

	// Setup leave callback
	var leaveOnce sync.Once
	var leftMember *Member
	leaveDone := make(chan struct{})

	mesh1.OnLeave(func(m *Member) {
		// Only capture the first leave event for node2
		if m.Name == "node2" {
			leaveOnce.Do(func() {
				leftMember = m
				close(leaveDone)
			})
		}
	})

	// Stop second mesh (graceful leave)
	err = mesh2.Stop()
	require.NoError(t, err)

	// Wait for leave event
	select {
	case <-leaveDone:
		// Success
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for leave event")
	}

	require.NotNil(t, leftMember)
	require.Equal(t, "node2", leftMember.Name)
}

func TestMemberTags(t *testing.T) {
	// Create first mesh with tags
	config1 := MeshConfig{
		NodeName: "service1",
		BindAddr: "127.0.0.1",
		BindPort: 0,
		Tags: map[string]string{
			"type":    "http",
			"service": "api",
			"version": "v1",
		},
	}

	mesh1, err := NewMesh(config1)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh1.Start(ctx)
	require.NoError(t, err)
	defer mesh1.Stop()

	// Verify tags are accessible
	members := mesh1.Members()
	require.Len(t, members, 1)

	member := members[0]
	require.Equal(t, "http", member.Tags["type"])
	require.Equal(t, "api", member.Tags["service"])
	require.Equal(t, "v1", member.Tags["version"])

	// Test GetMembersByTag
	httpServices := mesh1.GetMembersByTag("type", "http")
	require.Len(t, httpServices, 1)
	require.Equal(t, "service1", httpServices[0].Name)

	apiServices := mesh1.GetMembersByTag("service", "api")
	require.Len(t, apiServices, 1)
	require.Equal(t, "service1", apiServices[0].Name)

	// Test non-existent tag
	dbServices := mesh1.GetMembersByTag("type", "postgres")
	require.Len(t, dbServices, 0)
}

func TestMeshStop(t *testing.T) {
	config := MeshConfig{
		NodeName: "test-node",
		BindAddr: "127.0.0.1",
		BindPort: 0,
	}

	mesh, err := NewMesh(config)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh.Start(ctx)
	require.NoError(t, err)

	err = mesh.Stop()
	require.NoError(t, err)

	// Stop again should not error
	err = mesh.Stop()
	require.NoError(t, err)
}

func TestGetMembersByStatus(t *testing.T) {
	config := MeshConfig{
		NodeName: "test-node",
		BindAddr: "127.0.0.1",
		BindPort: 0,
	}

	mesh, err := NewMesh(config)
	require.NoError(t, err)

	ctx := context.Background()
	err = mesh.Start(ctx)
	require.NoError(t, err)
	defer mesh.Stop()

	// Get alive members
	aliveMembers := mesh.GetMembersByStatus("alive")
	require.Len(t, aliveMembers, 1)
	require.Equal(t, "test-node", aliveMembers[0].Name)

	// Get failed members (should be none)
	failedMembers := mesh.GetMembersByStatus("failed")
	require.Len(t, failedMembers, 0)
}

func TestFilterMembers(t *testing.T) {
	members := []*Member{
		{
			Name: "service1",
			Tags: map[string]string{
				"type": "http",
			},
			Status: "alive",
		},
		{
			Name: "service2",
			Tags: map[string]string{
				"type": "postgres",
			},
			Status: "alive",
		},
		{
			Name: "service3",
			Tags: map[string]string{
				"type": "http",
			},
			Status: "failed",
		},
	}

	// Filter by tag
	httpServices := FilterMembers(members, FilterByTag("type", "http"))
	require.Len(t, httpServices, 2)

	// Filter by status
	aliveServices := FilterMembers(members, FilterByStatus("alive"))
	require.Len(t, aliveServices, 2)

	// Combine filters
	aliveHttpServices := FilterMembers(
		FilterMembers(members, FilterByTag("type", "http")),
		FilterByStatus("alive"),
	)
	require.Len(t, aliveHttpServices, 1)
	require.Equal(t, "service1", aliveHttpServices[0].Name)
}
